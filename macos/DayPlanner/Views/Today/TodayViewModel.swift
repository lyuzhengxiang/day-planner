import Foundation
import Observation
import SwiftData

/// Async actions for the Today screen. Kept thin so the bulk of state stays
/// in SwiftData via `@Query`. Owns the loading flag + last error so the view
/// can disable buttons and show toasts.
@MainActor
@Observable
public final class TodayViewModel {
    public enum Phase: Equatable {
        case idle
        case generating
        case error(String)
    }

    public private(set) var phase: Phase = .idle

    private let planGenerator: PlanGenerator

    public init(planGenerator: PlanGenerator = PlanGenerator()) {
        self.planGenerator = planGenerator
    }

    public var isGenerating: Bool {
        if case .generating = phase { return true }
        return false
    }

    /// Generates (or regenerates) today's plan. Replaces any existing plan
    /// for today via `PlanGenerator.generate`.
    public func generate(context: ModelContext) async {
        phase = .generating
        do {
            _ = try await planGenerator.generate(context: context)
            phase = .idle
        } catch {
            AppLog.ui.error("TodayViewModel.generate failed: \(String(describing: error), privacy: .public)")
            phase = .error(error.localizedDescription)
        }
    }

    /// Toggles a task's completed state and saves. Plain, but centralized so
    /// the view doesn't reach into the context directly.
    public func toggleCompleted(_ task: Task, context: ModelContext) {
        task.completed.toggle()
        task.updatedAt = Date()
        try? context.save()
    }
}
