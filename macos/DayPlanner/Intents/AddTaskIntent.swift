import AppIntents
import Foundation
import SwiftData

/// "Hey Siri, add task X to today."
/// Inserts an ad-hoc Task on today's DailyPlan, creating a stub plan if none
/// exists yet (so the user can build a list before generating).
struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Add task to today"
    static var description = IntentDescription(
        "Adds a one-off task to today's plan."
    )
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Task text", description: "What is the task?")
    var text: String

    @Parameter(
        title: "Urgency",
        description: "URGENT, HIGH, MEDIUM, or LOW",
        default: .medium
    )
    var urgency: UrgencyAppEnum

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog & ReturnsValue<TaskEntity> {
        let context = ModelContext(DataController.shared.container)
        let start = Date().startOfDay()

        let descriptor = FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == start })
        let plan: DailyPlan
        if let existing = try? context.fetch(descriptor).first {
            plan = existing
        } else {
            plan = DailyPlan(
                date: start,
                quote: "",
                weatherSummary: "",
                markdownPath: "",
                streakCount: 0
            )
            context.insert(plan)
        }

        let existingTasks = plan.tasks ?? []
        let nextOrder = (existingTasks.map(\.order).max() ?? -1) + 1

        let task = Task(
            text: text,
            urgency: urgency.swiftUrgency,
            order: nextOrder,
            dailyPlan: plan
        )
        context.insert(task)
        try context.save()

        let entity = TaskEntity(model: task)
        let msg = "Added \"\(text)\" to today's plan."
        AppLog.intent.info("AddTaskIntent inserted task id=\(String(describing: task.persistentModelID), privacy: .public)")
        return .result(value: entity, dialog: IntentDialog(stringLiteral: msg))
    }
}

/// AppIntents requires its own enum type (must conform to AppEnum). We mirror
/// the four cases from `Urgency` rather than try to bridge SwiftData's enum.
enum UrgencyAppEnum: String, AppEnum {
    case urgent = "URGENT"
    case high = "HIGH"
    case medium = "MEDIUM"
    case low = "LOW"

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(name: "Urgency")
    }

    static var caseDisplayRepresentations: [UrgencyAppEnum: DisplayRepresentation] = [
        .urgent: "Urgent",
        .high: "High",
        .medium: "Medium",
        .low: "Low",
    ]

    var swiftUrgency: Urgency {
        Urgency(rawValue: rawValue) ?? .medium
    }
}
