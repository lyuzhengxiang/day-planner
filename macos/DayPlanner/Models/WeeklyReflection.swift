import Foundation
import SwiftData

/// Stored weekly scorecard and carry-forward list.
/// Mirrors `WeeklyReflection` from the Prisma schema.
@Model
public final class WeeklyReflection {
    @Attribute(.unique) public var weekStart: Date = Date()
    public var tasksCompleted: Int = 0
    public var tasksTotal: Int = 0
    /// JSON-encoded array of `{goalId, goalText, tasksCompleted, tasksTotal}`.
    public var goalsBreakdownJSON: String = "[]"
    /// JSON-encoded array of task texts.
    public var carryForwardJSON: String = "[]"
    public var summary: String = ""
    public var createdAt: Date = Date()

    public init(
        weekStart: Date,
        tasksCompleted: Int,
        tasksTotal: Int,
        goalsBreakdownJSON: String = "[]",
        carryForwardJSON: String = "[]",
        summary: String
    ) {
        self.weekStart = weekStart
        self.tasksCompleted = tasksCompleted
        self.tasksTotal = tasksTotal
        self.goalsBreakdownJSON = goalsBreakdownJSON
        self.carryForwardJSON = carryForwardJSON
        self.summary = summary
    }
}

public struct GoalBreakdownEntry: Codable, Equatable, Sendable {
    public var goalId: String
    public var goalText: String
    public var tasksCompleted: Int
    public var tasksTotal: Int
}

public extension WeeklyReflection {
    func decodeGoalsBreakdown() -> [GoalBreakdownEntry] {
        guard let data = goalsBreakdownJSON.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([GoalBreakdownEntry].self, from: data)
        else { return [] }
        return decoded
    }

    func decodeCarryForward() -> [String] {
        guard let data = carryForwardJSON.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return decoded
    }
}
