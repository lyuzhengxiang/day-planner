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

        try? context.save()
    }
}
