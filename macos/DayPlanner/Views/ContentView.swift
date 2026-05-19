import SwiftUI
import SwiftData

/// Root view. NavigationSplitView with five sections; only Today is built out
/// for v3 milestone — Week / History / Review / Settings ship as placeholder
/// "coming soon" panels so the navigation surface is wired and reviewable.
struct ContentView: View {
    @State private var selection: Section = .today

    enum Section: String, Hashable, CaseIterable, Identifiable {
        case today, week, history, review, settings
        var id: String { rawValue }

        var title: String {
            switch self {
            case .today:    return "Today"
            case .week:     return "Week"
            case .history:  return "History"
            case .review:   return "Review"
            case .settings: return "Settings"
            }
        }

        var systemImage: String {
            switch self {
            case .today:    return "sun.max"
            case .week:     return "calendar"
            case .history:  return "clock.arrow.circlepath"
            case .review:   return "checkmark.seal"
            case .settings: return "gear"
            }
        }
    }

    var body: some View {
        NavigationSplitView {
            List(Section.allCases, selection: $selection) { section in
                Label(section.title, systemImage: section.systemImage)
                    .font(.system(.body, design: .monospaced))
                    .tag(section)
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 160, ideal: 180)
        } detail: {
            switch selection {
            case .today:    TodayView()
            case .week:     ComingSoonView(title: "Weekly Goals")
            case .history:  ComingSoonView(title: "History")
            case .review:   ComingSoonView(title: "Reflection")
            case .settings: ComingSoonView(title: "Settings")
            }
        }
        .frame(minWidth: 820, minHeight: 600)
        .preferredColorScheme(.dark)
    }
}

private struct ComingSoonView: View {
    let title: String
    var body: some View {
        VStack(spacing: 12) {
            Text(title)
                .font(.system(.title, design: .monospaced).weight(.semibold))
            Text("Coming in the next milestone.")
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.85))
    }
}

#Preview {
    ContentView()
        .modelContainer(DataController.shared.container)
}
