import AppIntents
import Foundation
import SwiftData

/// "Hey Siri, run my morning routine in DayPlanner."
///
/// Mirrors what `Scheduler.runMorning()` does on the scheduled morningTime
/// fire: regenerate today's plan from goals + carry-over + weather, then
/// return a conversational summary that Siri speaks back to the user.
struct MorningRoutineIntent: AppIntent {
    static var title: LocalizedStringResource = "Run morning routine"
    static var description = IntentDescription(
        "Runs the daily morning routine: generates today's plan from your weekly goals, pulls weather, and reads back a summary."
    )
    static var openAppWhenRun: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let context = ModelContext(DataController.shared.container)

        do {
            let out = try await PlanGenerator().generate(context: context)

            // Fetch the just-generated plan so we can pull the top task text.
            let start = Date().startOfDay()
            let plan = try? context.fetch(
                FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == start })
            ).first
            let tasks = (plan?.tasks ?? []).sorted { $0.order < $1.order }
            let topTask = tasks.first(where: { $0.urgency == .urgent })
                ?? tasks.first(where: { $0.urgency == .high })
                ?? tasks.first

            let hour = Calendar.current.component(.hour, from: Date())
            let greeting = hour < 12 ? "Good morning" : "Here's your plan"

            var parts: [String] = ["\(greeting)."]
            parts.append("Today's plan has \(out.taskCount) tasks.")
            if let top = topTask {
                parts.append("Top priority is \(top.text).")
            }
            if out.streak > 0 {
                parts.append("Streak: \(out.streak) days.")
            }
            if !out.weather.isEmpty && out.weather != "Weather unavailable" {
                parts.append("Weather: \(out.weather).")
            }

            let summary = parts.joined(separator: " ")
            AppLog.intent.info("MorningRoutineIntent — \(out.taskCount) tasks, streak \(out.streak)")
            return .result(dialog: IntentDialog(stringLiteral: summary))
        } catch {
            AppLog.intent.error("MorningRoutineIntent failed: \(String(describing: error), privacy: .public)")
            return .result(dialog: IntentDialog(stringLiteral: "Couldn't generate the morning plan. Check the app for details."))
        }
    }
}
