import Foundation
import SwiftData

/// Computes the current streak: number of consecutive prior days for which a
/// `DailyPlan` exists AND every task on it is completed. Days with no plan
/// don't break the streak — only days with a plan but incomplete tasks do.
public struct StreakService: Sendable {
    public init() {}

    @MainActor
    public func calculate(context: ModelContext, today: Date = Date()) -> Int {
        let startOfToday = today.startOfDay()
        let descriptor = FetchDescriptor<DailyPlan>(
            predicate: #Predicate { $0.date < startOfToday },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        let plans = (try? context.fetch(descriptor)) ?? []

        var streak = 0
        for plan in plans {
            let tasks = plan.tasks ?? []
            if tasks.isEmpty { continue }
            let allDone = tasks.allSatisfy { $0.completed }
            if allDone {
                streak += 1
            } else {
                break
            }
        }
        return streak
    }
}
