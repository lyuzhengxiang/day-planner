import SwiftUI
import SwiftData

@main
struct DayPlannerApp: App {
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
