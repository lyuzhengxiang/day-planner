import Foundation
import SwiftData

/// A task belonging to a daily plan.
/// Mirrors `Task` from the Prisma schema.
@Model
public final class Task {
    public var text: String = ""
    public var urgencyRaw: String = Urgency.medium.rawValue
    public var completed: Bool = false
    public var rolledOver: Bool = false
    public var rolledDays: Int = 0
    public var order: Int = 0
    public var createdAt: Date = Date()
    public var updatedAt: Date = Date()

    public var dailyPlan: DailyPlan?
    public var weeklyGoal: WeeklyGoal?

    public var urgency: Urgency {
        get { Urgency(rawValue: urgencyRaw) ?? .medium }
        set { urgencyRaw = newValue.rawValue }
    }

    public init(
        text: String,
        urgency: Urgency = .medium,
        completed: Bool = false,
        rolledOver: Bool = false,
        rolledDays: Int = 0,
        order: Int = 0,
        dailyPlan: DailyPlan? = nil,
        weeklyGoal: WeeklyGoal? = nil
    ) {
        self.text = text
        self.urgencyRaw = urgency.rawValue
        self.completed = completed
        self.rolledOver = rolledOver
        self.rolledDays = rolledDays
        self.order = order
        self.dailyPlan = dailyPlan
        self.weeklyGoal = weeklyGoal
    }
}
