import AppIntents
import Foundation
import SwiftData

/// "Hey Siri, what's next?"
/// Returns the next incomplete task, prioritizing URGENT > HIGH > MEDIUM > LOW
/// then by `order`. Speaks the task text back to the user.
struct NextTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Next task"
    static var description = IntentDescription(
        "Tells you the next thing to do on today's plan."
    )
    static var openAppWhenRun: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog & ReturnsValue<TaskEntity?> {
        let context = ModelContext(DataController.shared.container)
        let start = Date().startOfDay()
        let descriptor = FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == start })

        guard let plan = try? context.fetch(descriptor).first else {
            return .result(value: nil, dialog: IntentDialog(stringLiteral: "No plan for today yet."))
        }

        let remaining = (plan.tasks ?? [])
            .filter { !$0.completed }
            .sorted { lhs, rhs in
                if lhs.urgency != rhs.urgency { return lhs.urgency < rhs.urgency }
                return lhs.order < rhs.order
            }

        guard let next = remaining.first else {
            return .result(value: nil, dialog: IntentDialog(stringLiteral: "You're done for today. Nice."))
        }
        let entity = TaskEntity(model: next)
        return .result(
            value: entity,
            dialog: IntentDialog(stringLiteral: "Next up: \(next.text). Urgency \(next.urgency.rawValue).")
        )
    }
}
