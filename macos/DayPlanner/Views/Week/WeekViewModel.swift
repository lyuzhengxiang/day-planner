import Foundation
import Observation
import SwiftData

/// Drives the multi-step weekly-goal interview. Holds enough state for the
/// SwiftUI sheet to render the right phase.
@MainActor
@Observable
public final class WeekViewModel {
    public enum Phase: Equatable {
        case idle
        case starting
        case answering(question: GoalQuestion, number: Int)
        case finalizing
        case reviewing(drafts: [GoalSessionService.GoalDraft])
        case saving
        case done
        case error(String)
    }

    public private(set) var phase: Phase = .idle
    public private(set) var session: GoalSession?
    public var initialInput: String = ""
    public var otherInput: String = ""

    private let service: GoalSessionService

    public init(service: GoalSessionService = GoalSessionService()) {
        self.service = service
    }

    // MARK: - Lifecycle

    public func reset() {
        phase = .idle
        session = nil
        initialInput = ""
        otherInput = ""
    }

    public func start(context: ModelContext) async {
        phase = .starting
        do {
            let (session, question) = try await service.start(input: initialInput, context: context)
            self.session = session
            phase = .answering(question: question, number: 1)
        } catch {
            handleError(error)
        }
    }

    public func answer(_ value: String, context: ModelContext) async {
        guard let session else { return }
        let answered = phase
        let currentNumber: Int
        if case let .answering(_, n) = answered {
            currentNumber = n
        } else { return }

        // Show a transitional state — finalizing if this was the last question.
        if currentNumber >= GoalSessionService.totalQuestions {
            phase = .finalizing
        } else {
            phase = .starting  // re-use spinner state
        }

        do {
            let outcome = try await service.answer(session: session, answer: value, context: context)
            otherInput = ""
            switch outcome {
            case .nextQuestion(let q, let n):
                phase = .answering(question: q, number: n)
            case .done(let drafts):
                phase = .reviewing(drafts: drafts)
            }
        } catch {
            handleError(error)
        }
    }

    public func shuffle() async {
        guard let session else { return }
        phase = .finalizing
        do {
            let drafts = try await service.shuffle(session: session)
            phase = .reviewing(drafts: drafts)
        } catch {
            handleError(error)
        }
    }

    public func save(drafts: [GoalSessionService.GoalDraft], context: ModelContext) async {
        guard let session else { return }
        phase = .saving
        do {
            try service.save(session: session, goals: drafts, context: context)
            phase = .done
        } catch {
            handleError(error)
        }
    }

    // MARK: - Helpers

    public var isBusy: Bool {
        switch phase {
        case .starting, .finalizing, .saving: return true
        default: return false
        }
    }

    private func handleError(_ error: Error) {
        AppLog.ui.error("WeekViewModel error: \(String(describing: error), privacy: .public)")
        phase = .error(error.localizedDescription)
    }
}
