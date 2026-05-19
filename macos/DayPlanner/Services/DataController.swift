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
            print("[DataController] On-disk store failed (\(error)); falling back to in-memory store.")
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
}
