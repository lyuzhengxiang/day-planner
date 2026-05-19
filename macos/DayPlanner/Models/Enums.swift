import Foundation

/// Urgency / priority levels. String-backed for SwiftData compatibility
/// and direct round-trip with the OpenAI JSON response.
public enum Urgency: String, Codable, CaseIterable, Comparable, Sendable {
    case urgent = "URGENT"
    case high = "HIGH"
    case medium = "MEDIUM"
    case low = "LOW"

    public static func < (lhs: Urgency, rhs: Urgency) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }

    /// Sort order so URGENT < HIGH < MEDIUM < LOW for ascending display.
    private var sortOrder: Int {
        switch self {
        case .urgent: return 0
        case .high: return 1
        case .medium: return 2
        case .low: return 3
        }
    }
}

public typealias Priority = Urgency

public enum GoalSessionStatus: String, Codable, Sendable {
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
}
