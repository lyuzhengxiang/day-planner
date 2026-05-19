import Foundation
import SwiftData

/// Active weekly goals that drive plan generation.
/// Mirrors `WeeklyGoal` from the Prisma schema.
@Model
public final class WeeklyGoal {
    public var text: String = ""
    /// Stored as String to round-trip with the OpenAI JSON contract.
    public var priorityRaw: String = Priority.medium.rawValue
    public var weekStart: Date = Date()
    public var active: Bool = true
    public var createdAt: Date = Date()
    public var updatedAt: Date = Date()

    @Relationship(inverse: \GoalSession.weeklyGoals)
    public var goalSession: GoalSession?

    @Relationship(inverse: \Task.weeklyGoal)
    public var tasks: [Task]? = []

    public var priority: Priority {
        get { Priority(rawValue: priorityRaw) ?? .medium }
        set { priorityRaw = newValue.rawValue }
    }

    public init(
        text: String,
        priority: Priority = .medium,
        weekStart: Date,
        active: Bool = true,
        goalSession: GoalSession? = nil
    ) {
        self.text = text
        self.priorityRaw = priority.rawValue
        self.weekStart = weekStart
        self.active = active
        self.goalSession = goalSession
    }
}
