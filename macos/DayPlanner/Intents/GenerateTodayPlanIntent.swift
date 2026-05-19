import AppIntents
import Foundation
import SwiftData

/// "Hey Siri, generate today's plan."
/// Triggers the full PlanGenerator pipeline (weather + quote + LLM + markdown
/// + notification).
struct GenerateTodayPlanIntent: AppIntent {
    static var title: LocalizedStringResource = "Generate today's plan"
    static var description = IntentDescription(
        "Builds today's plan from your weekly goals, rolled-over tasks, and weather."
    )
    static var openAppWhenRun: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let context = ModelContext(DataController.shared.container)
        do {
            let out = try await PlanGenerator().generate(context: context)
            let msg = "Generated \(out.taskCount) tasks. Streak: \(out.streak) days. Weather: \(out.weather)."
            AppLog.intent.info("GenerateTodayPlanIntent done — \(out.taskCount) tasks")
            return .result(dialog: IntentDialog(stringLiteral: msg))
        } catch {
            AppLog.intent.error("GenerateTodayPlanIntent failed: \(String(describing: error), privacy: .public)")
            return .result(dialog: IntentDialog(stringLiteral: "Couldn't generate the plan. Check the app for details."))
        }
    }
}
