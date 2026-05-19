import SwiftUI
import SwiftData
import Observation

/// Weekly reflection screen. Shows the current week's WeeklyReflection if it
/// exists; otherwise offers a "Generate reflection" button that calls
/// `ReflectionService.generate(...)`. Mirrors `/review` in v2.
struct ReviewView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WeeklyReflection.weekStart, order: .reverse) private var reflections: [WeeklyReflection]
    @State private var viewModel = ReviewViewModel()

    private var thisWeek: WeeklyReflection? {
        let weekStart = Date().startOfWeekMonday()
        return reflections.first { $0.weekStart == weekStart }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header

                if let reflection = thisWeek {
                    reflectionCard(reflection)
                } else {
                    emptyState
                }

                if case .error(let msg) = viewModel.phase {
                    errorBanner(msg)
                }

                if !reflections.isEmpty {
                    pastReflectionsSection
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.black.opacity(0.85))
    }

    // MARK: - Sections

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Weekly Reflection")
                    .font(.system(.title2, design: .monospaced).weight(.semibold))
                Text("Week of \(DateFormatters.humanLong.string(from: Date().startOfWeekMonday()))")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                _Concurrency.Task { await viewModel.generate(context: modelContext) }
            } label: {
                if viewModel.isGenerating {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.small)
                        Text("Generating…")
                    }
                } else {
                    Label(thisWeek == nil ? "Generate reflection" : "Regenerate",
                          systemImage: "wand.and.stars")
                }
            }
            .buttonStyle(.bordered)
            .disabled(viewModel.isGenerating)
        }
    }

    private func reflectionCard(_ reflection: WeeklyReflection) -> some View {
        let breakdown = reflection.decodeGoalsBreakdown()
        let carryForward = reflection.decodeCarryForward()
        let total = reflection.tasksTotal
        let completed = reflection.tasksCompleted
        let pct = total == 0 ? 0 : (completed * 100) / total

        return VStack(alignment: .leading, spacing: 14) {
            // Scorecard
            HStack(spacing: 16) {
                scorecardCell(value: "\(completed)/\(total)", label: "Tasks done")
                scorecardCell(value: "\(pct)%", label: "Completion")
                scorecardCell(value: "\(breakdown.count)", label: "Goals tracked")
            }

            // Summary
            if !reflection.summary.isEmpty {
                Text(reflection.summary)
                    .font(.system(.body, design: .monospaced))
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color(red: 0.55, green: 0.85, blue: 0.55).opacity(0.4), lineWidth: 1)
                    )
            }

            // Goals breakdown
            if !breakdown.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Goals breakdown")
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(.secondary)
                    ForEach(breakdown, id: \.goalId) { entry in
                        goalBreakdownRow(entry)
                    }
                }
            }

            // Carry-forward
            if !carryForward.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Carry forward")
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(carryForward, id: \.self) { task in
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.uturn.right")
                                    .foregroundStyle(.orange.opacity(0.85))
                                Text(task)
                                    .font(.system(.callout, design: .monospaced))
                            }
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color.orange.opacity(0.4), lineWidth: 1)
                    )
                }
            }
        }
    }

    private func scorecardCell(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(.title3, design: .monospaced).weight(.semibold))
            Text(label)
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.secondary.opacity(0.25), lineWidth: 1)
        )
    }

    private func goalBreakdownRow(_ entry: GoalBreakdownEntry) -> some View {
        HStack {
            Text(entry.goalText)
                .font(.system(.callout, design: .monospaced))
                .lineLimit(1)
            Spacer()
            Text("\(entry.tasksCompleted) / \(entry.tasksTotal)")
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        )
    }

    private var pastReflectionsSection: some View {
        let past = reflections.filter { $0.weekStart != Date().startOfWeekMonday() }
        return Group {
            if !past.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Past reflections")
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(.secondary)
                    ForEach(past) { r in
                        HStack {
                            Text(DateFormatters.humanLong.string(from: r.weekStart))
                                .font(.system(.callout, design: .monospaced))
                            Spacer()
                            Text("\(r.tasksCompleted) / \(r.tasksTotal)")
                                .font(.system(.callout, design: .monospaced))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
                        )
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No reflection for this week yet.")
                .font(.system(.title3, design: .monospaced))
            Text("Generate one from this week's plan completion data.")
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.secondary.opacity(0.25), lineWidth: 1)
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

@MainActor
@Observable
final class ReviewViewModel {
    enum Phase: Equatable {
        case idle
        case generating
        case error(String)
    }

    var phase: Phase = .idle
    var isGenerating: Bool { if case .generating = phase { return true }; return false }

    private let service: ReflectionService

    init(service: ReflectionService = ReflectionService()) {
        self.service = service
    }

    func generate(context: ModelContext) async {
        phase = .generating
        do {
            _ = try await service.generate(context: context)
            phase = .idle
        } catch {
            AppLog.ui.error("ReviewViewModel.generate failed: \(String(describing: error), privacy: .public)")
            phase = .error(error.localizedDescription)
        }
    }
}

#Preview {
    ReviewView()
        .modelContainer(DataController.shared.container)
        .frame(width: 720, height: 700)
}
