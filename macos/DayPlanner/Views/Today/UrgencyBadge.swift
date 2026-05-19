import SwiftUI

struct UrgencyBadge: View {
    let urgency: Urgency

    var body: some View {
        Text(urgency.rawValue)
            .font(.system(.caption2, design: .monospaced).weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .foregroundStyle(color)
            .overlay(
                RoundedRectangle(cornerRadius: 3)
                    .stroke(color.opacity(0.6), lineWidth: 1)
            )
    }

    private var color: Color {
        switch urgency {
        case .urgent: return .red
        case .high: return .orange
        case .medium: return Color(red: 0.55, green: 0.85, blue: 0.55)
        case .low: return .secondary
        }
    }
}

#Preview {
    HStack {
        UrgencyBadge(urgency: .urgent)
        UrgencyBadge(urgency: .high)
        UrgencyBadge(urgency: .medium)
        UrgencyBadge(urgency: .low)
    }
    .padding()
    .preferredColorScheme(.dark)
}
