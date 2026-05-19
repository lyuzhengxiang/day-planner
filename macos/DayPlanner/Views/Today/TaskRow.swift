import SwiftUI
import SwiftData

struct TaskRow: View {
    @Bindable var task: Task
    var onToggle: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: task.completed ? "checkmark.square.fill" : "square")
                    .font(.system(size: 18))
                    .foregroundStyle(task.completed ? Color(red: 0.55, green: 0.85, blue: 0.55) : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(task.text)
                    .font(.system(.body, design: .monospaced))
                    .foregroundStyle(task.completed ? .secondary : .primary)
                    .strikethrough(task.completed, color: .secondary)

                HStack(spacing: 8) {
                    UrgencyBadge(urgency: task.urgency)
                    if task.rolledOver {
                        Label(
                            "rolled \(task.rolledDays)d",
                            systemImage: "arrow.uturn.right"
                        )
                        .labelStyle(.titleAndIcon)
                        .font(.system(.caption2, design: .monospaced))
                        .foregroundStyle(.orange.opacity(0.85))
                    }
                    if let goalText = task.weeklyGoal?.text {
                        Text("→ \(goalText)")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
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
