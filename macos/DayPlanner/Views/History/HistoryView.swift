import SwiftUI
import SwiftData

/// List of saved DailyPlans with completion summaries. Mirrors `/history`
/// in the Next.js app.
struct HistoryView: View {
    @Query(sort: \DailyPlan.date, order: .reverse) private var plans: [DailyPlan]

    var body: some View {
        NavigationStack {
            Group {
                if plans.isEmpty {
                    emptyState
                } else {
                    List(plans) { plan in
                        NavigationLink(value: plan.persistentModelID) {
                            HistoryRow(plan: plan)
                        }
                    }
                    .listStyle(.inset)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color.black.opacity(0.85))
            .navigationDestination(for: PersistentIdentifier.self) { pid in
                if let plan = plans.first(where: { $0.persistentModelID == pid }) {
                    HistoryDetailView(plan: plan)
                } else {
                    Text("Plan not found").foregroundStyle(.secondary)
                }
            }
            .navigationTitle("History")
            .toolbarBackground(.black.opacity(0.85), for: .windowToolbar)
        }
        .preferredColorScheme(.dark)
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
            Text("No saved plans yet.")
                .font(.system(.title3, design: .monospaced))
            Text("Generate a plan from Today to see it appear here.")
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct HistoryRow: View {
    let plan: DailyPlan

    var body: some View {
        let tasks = plan.tasks ?? []
        let completed = tasks.filter(\.completed).count
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(DateFormatters.humanLong.string(from: plan.date))
                    .font(.system(.body, design: .monospaced).weight(.semibold))
                if !plan.weatherSummary.isEmpty {
                    Text(plan.weatherSummary)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            Text("\(completed) / \(tasks.count)")
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(completed == tasks.count && tasks.count > 0
                                 ? Color(red: 0.55, green: 0.85, blue: 0.55)
                                 : .secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    HistoryView()
        .modelContainer(DataController.shared.container)
        .frame(width: 720, height: 600)
}
