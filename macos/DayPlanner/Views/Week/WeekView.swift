import SwiftUI
import SwiftData

/// Weekly goal management. Lists active goals and offers the AI-led setup
/// wizard. Mirrors `/week` in v2.
struct WeekView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(filter: #Predicate<WeeklyGoal> { $0.active },
           sort: [SortDescriptor(\WeeklyGoal.priorityRaw),
                  SortDescriptor(\WeeklyGoal.createdAt, order: .reverse)])
    private var activeGoals: [WeeklyGoal]

    @Query(sort: \WeeklyReflection.weekStart, order: .reverse) private var reflections: [WeeklyReflection]

    @State private var showingWizard = false

    private var latestReflection: WeeklyReflection? { reflections.first }
    private var carryForward: [String] {
        latestReflection?.decodeCarryForward() ?? []
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header

                if activeGoals.isEmpty {
                    emptyState
                } else {
                    goalsSection
                }

                if !carryForward.isEmpty {
                    carryForwardSection
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.black.opacity(0.85))
        .sheet(isPresented: $showingWizard) {
            GoalWizardView()
        }
    }

    // MARK: - Sections

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Weekly Goals")
                    .font(.system(.title2, design: .monospaced).weight(.semibold))
                Text("Week of \(DateFormatters.humanLong.string(from: Date().startOfWeekMonday()))")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                showingWizard = true
            } label: {
                Label(activeGoals.isEmpty ? "Set up goals" : "Re-run setup",
                      systemImage: "sparkles")
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var goalsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Active goals")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.secondary)
            VStack(spacing: 6) {
                ForEach(activeGoals) { goal in
                    GoalRow(goal: goal) {
                        deactivate(goal)
                    }
                }
            }
        }
    }

    private var carryForwardSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Carry-forward from last week")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(carryForward, id: \.self) { text in
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.uturn.right")
                            .foregroundStyle(.orange.opacity(0.85))
                        Text(text)
                            .font(.system(.callout, design: .monospaced))
                        Spacer()
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

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No active goals for this week.")
                .font(.system(.title3, design: .monospaced))
            Text("Run the AI-led setup to draft 4-6 weekly goals from a one-sentence focus.")
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

    // MARK: - Actions

    private func deactivate(_ goal: WeeklyGoal) {
        goal.active = false
        goal.updatedAt = Date()
        try? modelContext.save()
    }
}

private struct GoalRow: View {
    @Bindable var goal: WeeklyGoal
    var onDelete: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            UrgencyBadge(urgency: goal.priority)
            Text(goal.text)
                .font(.system(.body, design: .monospaced))
            Spacer()
            Button(action: onDelete) {
                Image(systemName: "trash")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.red.opacity(0.7))
        }
        .padding(10)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.secondary.opacity(0.25), lineWidth: 1)
        )
    }
}

#Preview {
    WeekView()
        .modelContainer(DataController.shared.container)
        .frame(width: 720, height: 600)
}
