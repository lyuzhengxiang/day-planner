import Foundation
import SwiftData

/// Generates and persists a `WeeklyReflection` for the current ISO week.
/// Mirrors `src/lib/reflection.ts`.
public final class ReflectionService {
    private let llm: LLMService

    public init(llm: LLMService = OpenAIService()) {
        self.llm = llm
    }

    public struct Output: Sendable {
        public let weekStart: Date
        public let tasksCompleted: Int
        public let tasksTotal: Int
        public let summary: String
        public let goalsBreakdown: [GoalBreakdownEntry]
        public let carryForward: [String]
    }

    @MainActor
    public func generate(context: ModelContext, now: Date = Date()) async throws -> Output {
        let weekStart = now.startOfWeekMonday()
        let weekEnd = Calendar(identifier: .iso8601).date(byAdding: .day, value: 7, to: weekStart) ?? now

        // Fetch all plans in this week.
        let plansDescriptor = FetchDescriptor<DailyPlan>(
            predicate: #Predicate { $0.date >= weekStart && $0.date < weekEnd }
        )
        let plans = (try? context.fetch(plansDescriptor)) ?? []
        let allTasks = plans.flatMap { $0.tasks ?? [] }
        let tasksCompleted = allTasks.filter(\.completed).count
        let tasksTotal = allTasks.count

        // Active weekly goals for this week.
        let goalsDescriptor = FetchDescriptor<WeeklyGoal>(
            predicate: #Predicate { $0.active && $0.weekStart == weekStart }
        )
        let goals = (try? context.fetch(goalsDescriptor)) ?? []

        let goalsBreakdown: [GoalBreakdownEntry] = goals.map { goal in
            let goalTasks = goal.tasks ?? []
            return GoalBreakdownEntry(
                goalId: String(describing: goal.persistentModelID),
                goalText: goal.text,
                tasksCompleted: goalTasks.filter(\.completed).count,
                tasksTotal: goalTasks.count
            )
        }

        let incompleteTaskTexts = allTasks.filter { !$0.completed }.map(\.text)

        // SECURITY: sanitize goalText + incomplete-task texts before they hit
        // the prompt. Mirrors the Next.js src/lib/reflection.ts patch.
        let safeBreakdown = goalsBreakdown.map { entry in
            GoalBreakdownEntry(
                goalId: entry.goalId,
                goalText: PromptSafety.sanitize(entry.goalText),
                tasksCompleted: entry.tasksCompleted,
                tasksTotal: entry.tasksTotal
            )
        }
        let safeIncomplete = incompleteTaskTexts
            .map { PromptSafety.sanitize($0) }
            .filter { !$0.isEmpty }

        let breakdownJSON = (Self.encodeJSON(safeBreakdown) ?? "[]")
            .prefix(PromptSafety.Limits.totalUserBlock)
        let userBlock = PromptSafety.wrap(
            label: "weekly-stats",
            body: [
                "Completed \(tasksCompleted)/\(tasksTotal) tasks.",
                "Goals: \(breakdownJSON)",
                "Incomplete: \(safeIncomplete.isEmpty ? "None" : safeIncomplete.joined(separator: ", "))",
            ].joined(separator: "\n")
        )

        let systemPrompt =
            "Write a brief, encouraging weekly reflection (2-3 sentences). " +
            "Be honest about what didn't get done but focus on progress. " +
            PromptSafety.PREAMBLE

        let summary = (try? await llm.complete(
            systemPrompt: systemPrompt,
            userPrompt: userBlock,
            jsonMode: false,
            temperature: 0.7
        )) ?? ""

        // Upsert WeeklyReflection by weekStart.
        let reflectionDescriptor = FetchDescriptor<WeeklyReflection>(
            predicate: #Predicate { $0.weekStart == weekStart }
        )
        let existing = (try? context.fetch(reflectionDescriptor))?.first

        let goalsJSON = Self.encodeJSON(goalsBreakdown) ?? "[]"
        let carryJSON = Self.encodeJSON(incompleteTaskTexts) ?? "[]"

        if let row = existing {
            row.tasksCompleted = tasksCompleted
            row.tasksTotal = tasksTotal
            row.goalsBreakdownJSON = goalsJSON
            row.carryForwardJSON = carryJSON
            row.summary = summary
        } else {
            let reflection = WeeklyReflection(
                weekStart: weekStart,
                tasksCompleted: tasksCompleted,
                tasksTotal: tasksTotal,
                goalsBreakdownJSON: goalsJSON,
                carryForwardJSON: carryJSON,
                summary: summary
            )
            context.insert(reflection)
        }
        try context.save()

        return Output(
            weekStart: weekStart,
            tasksCompleted: tasksCompleted,
            tasksTotal: tasksTotal,
            summary: summary,
            goalsBreakdown: goalsBreakdown,
            carryForward: incompleteTaskTexts
        )
    }

    private static func encodeJSON<T: Encodable>(_ value: T) -> String? {
        guard let data = try? JSONEncoder().encode(value),
              let s = String(data: data, encoding: .utf8) else { return nil }
        return s
    }
}
