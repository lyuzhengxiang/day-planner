import SwiftUI
import SwiftData

/// Read-only detail for one DailyPlan. Mirrors `/history/[date]` in v2.
struct HistoryDetailView: View {
    let plan: DailyPlan

    var body: some View {
        let tasks = (plan.tasks ?? []).sorted { $0.order < $1.order }
        let completed = tasks.filter(\.completed).count

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header(completed: completed, total: tasks.count)

                if !plan.weatherSummary.isEmpty {
                    WeatherCard(summary: plan.weatherSummary)
                }
                if !plan.quote.isEmpty {
                    QuoteBanner(quote: plan.quote)
                }

                taskList(tasks: tasks)

                if !plan.markdownPath.isEmpty {
                    Text("Markdown: \(plan.markdownPath)")
                        .font(.system(.caption2, design: .monospaced))
                        .foregroundStyle(.tertiary)
                        .textSelection(.enabled)
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.black.opacity(0.85))
    }

    private func header(completed: Int, total: Int) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text(DateFormatters.humanLong.string(from: plan.date))
                    .font(.system(.title2, design: .monospaced).weight(.semibold))
                Text("\(completed) of \(total) complete")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            StreakBadge(days: plan.streakCount)
        }
    }

    private func taskList(tasks: [Task]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tasks")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.secondary)
            if tasks.isEmpty {
                Text("No tasks recorded.")
                    .font(.system(.callout, design: .monospaced))
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 6) {
                    ForEach(tasks) { task in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: task.completed ? "checkmark.square.fill" : "square")
                                .font(.system(size: 16))
                                .foregroundStyle(task.completed ? Color(red: 0.55, green: 0.85, blue: 0.55) : .secondary)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(task.text)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundStyle(task.completed ? .secondary : .primary)
                                    .strikethrough(task.completed, color: .secondary)
                                HStack(spacing: 8) {
                                    UrgencyBadge(urgency: task.urgency)
                                    if task.rolledOver {
                                        Text("rolled \(task.rolledDays)d")
                                            .font(.system(.caption2, design: .monospaced))
                                            .foregroundStyle(.orange.opacity(0.85))
                                    }
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                        )
                    }
                }
            }
        }
    }
}
