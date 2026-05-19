import AppIntents
import Foundation
import SwiftData

/// "Hey Siri, what's my plan today?"
/// Reads today's plan from SwiftData and returns a spoken summary.
struct TodayPlanIntent: AppIntent {
    static var title: LocalizedStringResource = "Show today's plan"
    static var description = IntentDescription(
        "Reads the current day's plan, weather, quote, and pending tasks."
    )
    static var openAppWhenRun: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog & ReturnsValue<String> {
        let context = ModelContext(DataController.shared.container)
        let start = Date().startOfDay()
        let descriptor = FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == start })

        guard let plan = try? context.fetch(descriptor).first else {
            let msg = "You don't have a plan for today yet. Ask me to generate one."
            return .result(value: msg, dialog: IntentDialog(stringLiteral: msg))
        }

        let tasks = (plan.tasks ?? []).sorted { $0.order < $1.order }
        let remaining = tasks.filter { !$0.completed }
        let topThree = remaining.prefix(3).map(\.text).joined(separator: "; ")
        let lines: [String] = [
            "Plan for \(DateFormatters.humanLong.string(from: plan.date)).",
            plan.weatherSummary.isEmpty ? "" : "Weather: \(plan.weatherSummary).",
            remaining.isEmpty
                ? "All tasks complete. Streak: \(plan.streakCount) days."
                : "\(remaining.count) of \(tasks.count) tasks open. Top: \(topThree)."
        ].filter { !$0.isEmpty }

        let summary = lines.joined(separator: " ")
        AppLog.intent.info("TodayPlanIntent → \(summary, privacy: .public)")
        return .result(value: summary, dialog: IntentDialog(stringLiteral: summary))
    }
}
