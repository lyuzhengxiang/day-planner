import SwiftUI
import SwiftData

@main
struct DayPlannerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("DayPlanner") {
            ContentView()
        }
        .modelContainer(DataController.shared.container)
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) {} // no "File → New" menu
        }
    }
}

/// Owns the in-process Scheduler. Boots on launch, tears down on termination.
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        Scheduler.shared.start()
        AppLog.scheduler.info("DayPlanner launched and scheduler started")
    }

    func applicationWillTerminate(_ notification: Notification) {
        Scheduler.shared.stop()
    }
}
