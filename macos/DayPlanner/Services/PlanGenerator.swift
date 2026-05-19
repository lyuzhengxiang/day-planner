import Foundation
import SwiftData

/// Generates today's plan: gathers weekly goals, carry-over tasks, recurring events,
/// weather, quote, and streak; asks the LLM for a structured task list; persists
/// the resulting `DailyPlan` + `Task` rows; exports a markdown copy; sends
/// a notification with the morning summary.
///
/// Mirrors `src/lib/generate-plan.ts` 1:1.
public final class PlanGenerator {
    private let llm: LLMService
    private let weather: WeatherService
    private let quotes: QuoteService
    private let streak: StreakService
    private let markdown: MarkdownExporter
    private let notifications: NotificationService

    public init(
        llm: LLMService = OpenAIService(),
        weather: WeatherService = WeatherService(),
        quotes: QuoteService = QuoteService(),
        streak: StreakService = StreakService(),
        markdown: MarkdownExporter = MarkdownExporter(),
        notifications: NotificationService = NotificationService()
    ) {
        self.llm = llm
        self.weather = weather
        self.quotes = quotes
        self.streak = streak
        self.markdown = markdown
        self.notifications = notifications
    }

    public struct Output: Sendable {
        public let planId: PersistentIdentifier
        public let quote: String
        public let weather: String
        public let streak: Int
        public let taskCount: Int
    }

    @MainActor
    public func generate(context: ModelContext, today: Date = Date()) async throws -> Output {
        let startOfToday = today.startOfDay()

        // 1. Gather inputs
        async let weatherSummary = weather.fetchCurrent()
        let pickedQuote = quotes.pick(context: context, today: startOfToday)
        let streakCount = streak.calculate(context: context, today: startOfToday)

        let goalsDescriptor = FetchDescriptor<WeeklyGoal>(
            predicate: #Predicate { $0.active }
        )
        let weeklyGoals = (try? context.fetch(goalsDescriptor)) ?? []

        let recurringDescriptor = FetchDescriptor<RecurringEvent>(
            predicate: #Predicate { $0.active }
        )
        let recurring = (try? context.fetch(recurringDescriptor)) ?? []
        let todaysEvents = recurring
            .filter { $0.occursOn(date: startOfToday) }
            .sorted { $0.startTime < $1.startTime }

        // Carried-over tasks: incomplete from before today.
        // #Predicate macro does not support optional chaining (task.dailyPlan?.date),
        // so we filter incomplete tasks in SwiftData and check the date in Swift.
        let incompleteDescriptor = FetchDescriptor<Task>(
            predicate: #Predicate { $0.completed == false },
            sortBy: [SortDescriptor(\.rolledDays, order: .reverse)]
        )
        let allIncomplete = (try? context.fetch(incompleteDescriptor)) ?? []
        let rolledTasks = allIncomplete.filter { task in
            guard let planDate = task.dailyPlan?.date else { return false }
            return planDate < startOfToday
        }

        let weatherStr = await weatherSummary

        // 2. Build prompt
        let goalsText = weeklyGoals.isEmpty
            ? "No weekly goals set"
            : weeklyGoals
                .map { "- [\($0.priority.rawValue)] \($0.text) (id: \($0.persistentModelID))" }
                .joined(separator: "\n")

        let rolledText = rolledTasks.isEmpty
            ? "None"
            : rolledTasks
                .map { "- \"\($0.text)\" (urgency: \($0.urgency.rawValue), rolled \($0.rolledDays) days)" }
                .joined(separator: "\n")

        let scheduleText = todaysEvents.isEmpty
            ? "No recurring events today"
            : todaysEvents
                .map { "- \($0.startTime)-\($0.endTime): \($0.title)" }
                .joined(separator: "\n")

        let prompt = """
        You are a proactive daily planner. Generate today's tasks based on the user's weekly goals, carried-over tasks, and schedule.

        Weekly Goals:
        \(goalsText)

        Carried-over tasks (incomplete from previous days):
        \(rolledText)

        Today's fixed schedule:
        \(scheduleText)

        Rules:
        - Generate 3-7 tasks total (including carried-over tasks)
        - Carried-over tasks should be included with bumped urgency
        - If a task has rolled 3+ days, flag it explicitly
        - Assign urgency: URGENT, HIGH, MEDIUM, or LOW
        - Each task should link to a weeklyGoalText if applicable (null if ad-hoc)
        - Schedule tasks around fixed events
        - Be specific and actionable

        Respond with ONLY valid JSON:
        {
          "tasks": [
            { "text": "task description", "urgency": "URGENT|HIGH|MEDIUM|LOW", "weeklyGoalText": "matching goal text or null" }
          ]
        }
        """

        // 3. Call LLM
        let raw = try await llm.complete(prompt: prompt, jsonMode: true, temperature: 0.7)
        let generated = try Self.parseGeneratedTasks(raw)

        // 4. Replace existing plan for today (regenerate semantics)
        let existingDescriptor = FetchDescriptor<DailyPlan>(
            predicate: #Predicate { $0.date == startOfToday }
        )
        if let existing = try? context.fetch(existingDescriptor).first {
            context.delete(existing) // cascade deletes its tasks
        }

        let plan = DailyPlan(
            date: startOfToday,
            quote: pickedQuote,
            weatherSummary: weatherStr,
            markdownPath: "",
            streakCount: streakCount
        )
        context.insert(plan)

        // 5. Create Task rows; carry rolled metadata from previous-day matches
        var insertedTasks: [Task] = []
        for (index, generatedTask) in generated.enumerated() {
            let urgency = Urgency(rawValue: generatedTask.urgency.uppercased()) ?? .medium
            let priorMatch = rolledTasks.first { $0.text == generatedTask.text }
            let matchingGoal = generatedTask.weeklyGoalText.flatMap { needle in
                weeklyGoals.first { $0.text == needle }
            }

            let task = Task(
                text: generatedTask.text,
                urgency: urgency,
                completed: false,
                rolledOver: priorMatch != nil,
                rolledDays: priorMatch.map { $0.rolledDays + 1 } ?? 0,
                order: index,
                dailyPlan: plan,
                weeklyGoal: matchingGoal
            )
            context.insert(task)
            insertedTasks.append(task)
        }

        try context.save()

        // 6. Export markdown
        let mdPath = markdown.export(
            date: startOfToday,
            weather: weatherStr,
            quote: pickedQuote,
            schedule: todaysEvents.map {
                MarkdownExporter.ScheduleItem(
                    title: $0.title,
                    startTime: $0.startTime,
                    endTime: $0.endTime
                )
            },
            tasks: insertedTasks.map {
                MarkdownExporter.TaskItem(
                    text: $0.text,
                    urgency: $0.urgency,
                    completed: $0.completed,
                    rolledOver: $0.rolledOver
                )
            }
        )
        plan.markdownPath = mdPath
        try context.save()

        // 7. Send notification
        let settings = (try? context.fetch(FetchDescriptor<AppSettings>()))?.first
        let appUrl = buildAppUrl(
            macLocalIp: settings?.macLocalIp ?? "",
            appPort: settings?.appPort ?? "3000"
        )
        let taskSummary = insertedTasks
            .map { "• [\($0.urgency.rawValue)] \($0.text)" }
            .joined(separator: "\n")
        let message = """
        Good morning! Here's your plan for today:

        "\(pickedQuote)"

        \(taskSummary)

        Weather: Chicago \(weatherStr)
        Streak: \(streakCount) days

        Open: \(appUrl)
        """
        _ = await notifications.notify(
            context: context,
            message: message,
            subject: "Your Day Plan"
        )

        return Output(
            planId: plan.persistentModelID,
            quote: pickedQuote,
            weather: weatherStr,
            streak: streakCount,
            taskCount: insertedTasks.count
        )
    }

    // MARK: - JSON wire shape

    public struct GeneratedTask: Decodable, Sendable {
        public let text: String
        public let urgency: String
        public let weeklyGoalText: String?
    }

    public struct GeneratedTaskList: Decodable, Sendable {
        public let tasks: [GeneratedTask]
    }

    /// Public for testing — parses the raw `chat.completions` content into our model.
    public static func parseGeneratedTasks(_ raw: String) throws -> [GeneratedTask] {
        guard let data = raw.data(using: .utf8) else {
            return []
        }
        let decoded = try JSONDecoder().decode(GeneratedTaskList.self, from: data)
        return decoded.tasks
    }
}

// MARK: - Helpers

func buildAppUrl(macLocalIp: String, appPort: String) -> String {
    let host = macLocalIp.isEmpty ? "localhost" : macLocalIp
    let port = appPort.isEmpty ? "3000" : appPort
    return "http://\(host):\(port)"
}
