import SwiftUI
import SwiftData

/// Day Planner's main screen. Shows today's plan with weather, quote,
/// streak, recurring schedule, and the task list. Offers a "Generate plan"
/// button when no plan exists yet.
struct TodayView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = TodayViewModel()

    // Today's plan — there is at most one (DailyPlan.date is unique per day).
    @Query(sort: \DailyPlan.date, order: .reverse) private var allPlans: [DailyPlan]
    @Query private var settings: [AppSettings]
    @Query(filter: #Predicate<RecurringEvent> { $0.active }) private var recurringEvents: [RecurringEvent]

    private var todaysPlan: DailyPlan? {
        let start = Date().startOfDay()
        return allPlans.first { $0.date == start }
    }

    private var todaysRecurring: [RecurringEvent] {
        recurringEvents
            .filter { $0.occursOn(date: Date()) }
            .sorted { $0.startTime < $1.startTime }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header

                if settings.first?.needsContactSetup ?? true {
                    firstRunBanner
                }

                if let plan = todaysPlan {
                    planContent(for: plan)
                } else {
                    emptyState
                }

                if case .error(let msg) = viewModel.phase {
                    errorBanner(msg)
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.black.opacity(0.85))
        .preferredColorScheme(.dark)
    }

    // MARK: - Sections

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text(DateFormatters.humanLong.string(from: Date()))
                    .font(.system(.title2, design: .monospaced).weight(.semibold))
                Text("Today")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if let plan = todaysPlan {
                StreakBadge(days: plan.streakCount)
            }
        }
    }

    private func planContent(for plan: DailyPlan) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            WeatherCard(summary: plan.weatherSummary)

            if !plan.quote.isEmpty {
                QuoteBanner(quote: plan.quote)
            }

            if !todaysRecurring.isEmpty {
                scheduleSection
            }

            taskList(for: plan)

            actionsRow
        }
    }

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Schedule")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(todaysRecurring) { event in
                    HStack(spacing: 8) {
                        Text("\(event.startTime)–\(event.endTime)")
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(.secondary)
                        Text(event.title)
                            .font(.system(.body, design: .monospaced))
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
            )
        }
    }

    private func taskList(for plan: DailyPlan) -> some View {
        let tasks = (plan.tasks ?? []).sorted { $0.order < $1.order }
        let completed = tasks.filter(\.completed).count
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Tasks")
                    .font(.system(.caption, design: .monospaced).weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(completed) / \(tasks.count)")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            if tasks.isEmpty {
                Text("No tasks for today.")
                    .font(.system(.callout, design: .monospaced))
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 6) {
                    ForEach(tasks) { task in
                        TaskRow(task: task) {
                            viewModel.toggleCompleted(task, context: modelContext)
                        }
                    }
                }
            }
        }
    }

    private var actionsRow: some View {
        HStack {
            Spacer()
            Button {
                _Concurrency.Task { await viewModel.generate(context: modelContext) }
            } label: {
                if viewModel.isGenerating {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.small)
                        Text("Regenerating…")
                    }
                } else {
                    Label("Regenerate plan", systemImage: "arrow.clockwise")
                }
            }
            .buttonStyle(.bordered)
            .disabled(viewModel.isGenerating)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "sun.horizon")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No plan for today yet.")
                .font(.system(.title3, design: .monospaced))
            Text("Generate one from your weekly goals and today's weather.")
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button {
                _Concurrency.Task { await viewModel.generate(context: modelContext) }
            } label: {
                if viewModel.isGenerating {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.small)
                        Text("Generating…")
                    }
                } else {
                    Label("Generate today's plan", systemImage: "sparkles")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isGenerating)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.secondary.opacity(0.25), lineWidth: 1)
        )
    }

    private var firstRunBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
            VStack(alignment: .leading, spacing: 2) {
                Text("Notifications not configured")
                    .font(.system(.callout, design: .monospaced).weight(.semibold))
                Text("Add an iMessage phone or email in Settings to receive your plan.")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(12)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.yellow.opacity(0.4), lineWidth: 1)
        )
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "xmark.octagon.fill")
                .foregroundStyle(.red)
            Text(message)
                .font(.system(.caption, design: .monospaced))
            Spacer()
        }
        .padding(10)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.red.opacity(0.5), lineWidth: 1)
        )
    }
}

#Preview {
    TodayView()
        .modelContainer(DataController.shared.container)
        .frame(width: 720, height: 720)
}
