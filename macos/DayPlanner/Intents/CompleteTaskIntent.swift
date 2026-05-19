import AppIntents
import Foundation
import SwiftData

/// "Hey Siri, complete <task name>."
/// Marks the chosen task as completed.
struct CompleteTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete task"
    static var description = IntentDescription(
        "Marks a task on today's plan as done."
    )
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Task", description: "Which task to complete")
    var task: TaskEntity

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let context = ModelContext(DataController.shared.container)
        guard let pid = TaskEntity.decode(task.id),
              let model = context.model(for: pid) as? Task else {
            let msg = "Couldn't find that task. It may already be cleared."
            return .result(dialog: IntentDialog(stringLiteral: msg))
        }
        if model.completed {
            return .result(dialog: IntentDialog(stringLiteral: "\"\(model.text)\" is already done."))
        }
        model.completed = true
        model.updatedAt = Date()
        try context.save()

        AppLog.intent.info("CompleteTaskIntent done id=\(String(describing: model.persistentModelID), privacy: .public)")
        return .result(dialog: IntentDialog(stringLiteral: "Marked \"\(model.text)\" as done."))
    }
}
