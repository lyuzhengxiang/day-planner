import Foundation
import SwiftData

/// Owns the SwiftData stack. Single source of truth for the `ModelContainer`.
///
/// The container is shared with the SwiftUI environment via `.modelContainer(_:)`
/// from `DayPlannerApp`. Services obtain a `ModelContext` from it as needed.
public final class DataController {
    public static let shared = DataController()

    public let container: ModelContainer

    /// Models managed by the container — keep in sync with `Models/*.swift`.
    public static let schemaTypes: [any PersistentModel.Type] = [
        AppSettings.self,
        WeeklyGoal.self,
        DailyPlan.self,
        Task.self,
        RecurringEvent.self,
        GoalSession.self,
        WeeklyReflection.self,
        QuoteLog.self,
    ]

    private init() {
        let schema = Schema(Self.schemaTypes)
        let storeURL = Self.defaultStoreURL()
        let configuration = ModelConfiguration(
            "DayPlanner",
            schema: schema,
            url: storeURL,
            allowsSave: true,
            cloudKitDatabase: .none
        )

        do {
            container = try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // We fall through to an in-memory store rather than crashing on first launch.
            // The user will see an error banner in the UI and can recover by quitting.
            let memoryConfig = ModelConfiguration(
                "DayPlanner-Memory",
                schema: schema,
                isStoredInMemoryOnly: true
            )
            container = try! ModelContainer(for: schema, configurations: [memoryConfig])
            AppLog.data.error("On-disk store failed: \(String(describing: error), privacy: .public); falling back to in-memory store.")
        }

        Seeder.seedIfNeeded(container: container)
    }

    /// Location of the SQLite store inside Application Support.
    private static func defaultStoreURL() -> URL {
        let fm = FileManager.default
        let appSupport = try? fm.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let dir = (appSupport ?? URL(fileURLWithPath: NSTemporaryDirectory()))
            .appendingPathComponent("DayPlanner", isDirectory: true)
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("store.sqlite")
    }
}

/// Inserts initial rows on first launch (Settings singleton).
enum Seeder {
    static func seedIfNeeded(container: ModelContainer) {
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<AppSettings>()
        let existing = (try? context.fetch(descriptor)) ?? []
        if existing.isEmpty {
            let defaults = AppSettings()
            context.insert(defaults)
            try? context.save()
        }
    }

    /// Demo-mode seeding. Gated by `DAYPLANNER_DEMO_MODE=true` so it never
    /// runs in real use. Inserts 3 sample weekly goals and a sample day plan
    /// for today (with 5 tasks) — but only if those slots are empty, so it
    /// won't clobber a returning user's data.
    @MainActor
    static func seedDemoIfRequested(container: ModelContainer) {
        guard ProcessInfo.processInfo.environment["DAYPLANNER_DEMO_MODE"] == "true" else { return }
        let context = ModelContext(container)

        let weekStart = Date().startOfWeekMonday()

        // 1. Sample weekly goals
        let activeGoalsCount = (try? context.fetch(
            FetchDescriptor<WeeklyGoal>(predicate: #Predicate { $0.active })
        ))?.count ?? 0
        if activeGoalsCount == 0 {
            let goals = [
                WeeklyGoal(text: "Finish DBS project v3 deliverable", priority: .urgent, weekStart: weekStart),
                WeeklyGoal(text: "Prep for Week 8 project demo", priority: .high, weekStart: weekStart),
                WeeklyGoal(text: "Read 30 minutes every day", priority: .medium, weekStart: weekStart),
            ]
            for g in goals { context.insert(g) }
        }

        // 2. Sample plan for today, only if none exists
        let today = Date().startOfDay()
        let existingPlan = try? context.fetch(
            FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == today })
        ).first
        if existingPlan == nil {
            let plan = DailyPlan(
                date: today,
                quote: "The secret of getting ahead is getting started.",
                weatherSummary: "Chicago 72°F, partly cloudy",
                markdownPath: "",
                streakCount: 4
            )
            context.insert(plan)

            let sampleTasks: [(String, Urgency)] = [
                ("Finalize Phase 4-6 demo script", .urgent),
                ("Send recording to study group", .high),
                ("Review weekly reflection from last week", .medium),
                ("Read 30 min before bed", .medium),
                ("Reply to advisor email", .low),
            ]
            for (i, (text, urgency)) in sampleTasks.enumerated() {
                let t = Task(text: text, urgency: urgency, order: i, dailyPlan: plan)
                context.insert(t)
            }
        }

        // 3. Past 6 days of plans (for the History page)
        seedPastPlans(context: context, today: today)

        // 4. Last week's reflection (for the Review page + carry-forward in Week)
        seedLastWeekReflection(context: context, thisWeekStart: weekStart)

        try? context.save()
    }

    // MARK: - Past plans (History)

    @MainActor
    private static func seedPastPlans(context: ModelContext, today: Date) {
        let cal = Calendar(identifier: .gregorian)

        // (daysAgo, quote, weather, streak, tasks: [(text, urgency, completed)])
        let past: [(Int, String, String, Int, [(String, Urgency, Bool)])] = [
            (1, "Done is better than perfect.", "Chicago 68°F, light rain", 3, [
                ("Wire AppDelegate scheduler", .urgent, true),
                ("Write SchedulerTests", .high, true),
                ("Update macos/README LaunchAgent section", .medium, true),
                ("Push Phase 4 branch", .high, false),
            ]),
            (2, "Make it work, then make it right.", "Chicago 65°F, overcast", 2, [
                ("Port LLMService system+user split", .urgent, true),
                ("Add PromptSafety to PlanGenerator", .urgent, true),
                ("Mirror 9 prompt-safety tests in Swift", .high, true),
                ("Update SECURITY.md", .medium, true),
                ("Run xcodebuild test on the worktree", .high, false),
            ]),
            (3, "The best way out is always through.", "Chicago 70°F, partly sunny", 1, [
                ("Bump next 16.2.2 → 16.2.6", .urgent, true),
                ("Add .github/dependabot.yml", .medium, true),
                ("Document known postcss issues", .low, false),
            ]),
            (4, "Slow is smooth, smooth is fast.", "Chicago 74°F, clear", 0, [
                ("Land Keychain + KeychainStore", .urgent, true),
                ("Add .env.example", .high, true),
                ("Convert all print() to AppLog", .medium, true),
                ("Verify dev/prod separation", .medium, true),
                ("Manual smoke test on a fresh checkout", .low, true),
                ("Sleep at a reasonable hour", .low, true),
            ]),
            (5, "Iteration beats hesitation.", "Chicago 71°F, light breeze", 6, [
                ("Scaffold macOS rewrite with XcodeGen", .urgent, true),
                ("Port 8 SwiftData @Model classes", .high, true),
                ("Write ModelsTests for DailyPlan/Task", .medium, false),
                ("Commit Phase 1+2", .high, true),
            ]),
            (6, "Ship things. Refactor later.", "Chicago 69°F, foggy", 5, [
                ("Settle on macOS 14 deployment target", .urgent, true),
                ("Pick OpenAI Swift SDK (MacPaw)", .high, true),
                ("Decide DMG over App Store", .medium, true),
            ]),
        ]

        for (daysAgo, quote, weather, streak, tasks) in past {
            guard let date = cal.date(byAdding: .day, value: -daysAgo, to: today)?.startOfDay() else { continue }
            if (try? context.fetch(
                FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == date })
            ).first) != nil {
                continue // don't double-seed
            }

            let plan = DailyPlan(
                date: date,
                quote: quote,
                weatherSummary: weather,
                markdownPath: "",
                streakCount: streak
            )
            context.insert(plan)
            for (i, (text, urgency, completed)) in tasks.enumerated() {
                let t = Task(
                    text: text,
                    urgency: urgency,
                    completed: completed,
                    order: i,
                    dailyPlan: plan
                )
                context.insert(t)
            }
        }
    }

    // MARK: - Reflection (Review)

    @MainActor
    private static func seedLastWeekReflection(context: ModelContext, thisWeekStart: Date) {
        let cal = Calendar(identifier: .iso8601)
        guard let lastWeekStart = cal.date(byAdding: .day, value: -7, to: thisWeekStart) else { return }

        if (try? context.fetch(
            FetchDescriptor<WeeklyReflection>(predicate: #Predicate { $0.weekStart == lastWeekStart })
        ).first) != nil {
            return
        }

        let goalsBreakdown: [GoalBreakdownEntry] = [
            .init(goalId: "demo-1", goalText: "Ship the v3 security pass", tasksCompleted: 8, tasksTotal: 9),
            .init(goalId: "demo-2", goalText: "Start the macOS rewrite", tasksCompleted: 7, tasksTotal: 8),
            .init(goalId: "demo-3", goalText: "Keep a daily reading habit", tasksCompleted: 5, tasksTotal: 7),
        ]
        let carryForward = [
            "Push Phase 4 branch",
            "Run xcodebuild test on the worktree",
            "Document known postcss issues",
        ]

        let breakdownJSON = (try? JSONEncoder().encode(goalsBreakdown))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        let carryJSON = (try? JSONEncoder().encode(carryForward))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"

        let reflection = WeeklyReflection(
            weekStart: lastWeekStart,
            tasksCompleted: 20,
            tasksTotal: 24,
            goalsBreakdownJSON: breakdownJSON,
            carryForwardJSON: carryJSON,
            summary: "Strong week — landed the entire v3 security pass and kicked off the native macOS rewrite. Three open items roll into next week, with the launchd wiring being the highest-leverage one. Reading habit slipped on the two long-shipping days; protect 30 minutes nightly going forward."
        )
        context.insert(reflection)
    }
}
