import SwiftUI
import SwiftData

/// Root container. The full SwiftUI surface (Today / Week / History / Settings /
/// Review tabs) is filled in across Phase 5; for now this just verifies the
/// scaffold compiles and the SwiftData container is reachable.
struct ContentView: View {
    @Query private var settings: [AppSettings]
    @Query(sort: \DailyPlan.date, order: .reverse) private var plans: [DailyPlan]

    var body: some View {
        VStack(spacing: 24) {
            Text("DayPlanner")
                .font(.system(.title, design: .monospaced).weight(.semibold))
            Text("Scaffold — Phase 1 + 2 + partial Phase 3")
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.secondary)

            GroupBox("Database") {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Settings rows: \(settings.count)")
                    Text("Daily plans: \(plans.count)")
                    if let first = settings.first {
                        Text("Morning time: \(first.morningTime)")
                        Text("Timezone: \(first.timezone)")
                        Text("Contact configured: \(first.needsContactSetup ? "no" : "yes")")
                    }
                }
                .font(.system(.body, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(8)
            }

            Text("Run `xcodegen generate && open DayPlanner.xcodeproj` after pulling.")
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.tertiary)
        }
        .padding(32)
        .frame(width: 480, height: 360)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
        .modelContainer(DataController.shared.container)
}
