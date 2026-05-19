import Foundation
import SwiftData

/// Drives the LLM-led weekly goal interview.
/// Mirrors `src/app/api/goals/{setup,answer,confirm}/route.ts` 1:1.
///
/// Flow:
///   start(input)      → GoalSession + first GoalQuestion
///   answer(session, …) → either next GoalQuestion or final GoalDraft list
///   shuffle(session)  → re-generates a different GoalDraft list
///   save(session, …)  → persists drafts as `WeeklyGoal` rows, marks session COMPLETED
public final class GoalSessionService {
    public static let totalQuestions = 5

    private let llm: LLMService

    public init(llm: LLMService = OpenAIService()) {
        self.llm = llm
    }

    // MARK: - Public outputs

    public struct GoalDraft: Sendable, Equatable {
        public var text: String
        public var priority: Urgency

        public init(text: String, priority: Urgency = .medium) {
            self.text = text
            self.priority = priority
        }
    }

    public enum AnswerOutcome: Sendable {
        case nextQuestion(GoalQuestion, questionNumber: Int)
        case done(goals: [GoalDraft])
    }

    // MARK: - Start

    /// Create a session, ask the LLM for the first question.
    @MainActor
    public func start(
        input: String,
        context: ModelContext
    ) async throws -> (session: GoalSession, question: GoalQuestion) {
        let safeInput = PromptSafety.sanitize(input, maxLen: PromptSafety.Limits.initialInput)
        guard !safeInput.isEmpty else {
            throw GoalSessionError.emptyInput
        }

        let existing = (try? context.fetch(
            FetchDescriptor<WeeklyGoal>(predicate: #Predicate { $0.active })
        )) ?? []
        let existingContext = existing.isEmpty
            ? "No previous goals"
            : PromptSafety.wrap(
                label: "existing-goals",
                body: existing.map { PromptSafety.sanitize($0.text) }.joined(separator: ", ")
            )

        let systemPrompt = """
        You are a weekly goal-setting assistant. \(PromptSafety.PREAMBLE)

        The user gives brief input about their focus. Generate the FIRST of \(Self.totalQuestions)-6 multiple-choice questions to understand their goals better. Each question should have 5-6 numbered options plus "Other".

        \(existingContext)

        Respond with ONLY valid JSON:
        {
          "question": "What's your main focus this week?",
          "options": ["Getting new users", "Building features", "Revenue/monetization", "Content/marketing", "Operations/admin", "Other (type your own)"]
        }
        """

        let userPrompt = PromptSafety.wrap(label: "user-input", body: safeInput)
        let raw = try await llm.complete(
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            jsonMode: true,
            temperature: 0.7
        )
        let parsed = try Self.parseQuestion(raw)

        let session = GoalSession(initialInput: safeInput)
        session.encodeQuestions([
            GoalQuestion(question: parsed.question, options: parsed.options, answer: nil),
        ])
        context.insert(session)
        try context.save()

        return (session, GoalQuestion(question: parsed.question, options: parsed.options))
    }

    // MARK: - Answer

    /// Record an answer. If we've hit the target count, ask the LLM to generate
    /// goal drafts; otherwise ask for the next question.
    @MainActor
    public func answer(
        session: GoalSession,
        answer: String,
        context: ModelContext
    ) async throws -> AnswerOutcome {
        guard session.status == .inProgress else { throw GoalSessionError.alreadyCompleted }

        var questions = session.decodeQuestions()
        guard !questions.isEmpty else { throw GoalSessionError.emptySession }

        questions[questions.count - 1].answer = PromptSafety.sanitize(answer)
        session.encodeQuestions(questions)
        try context.save()

        let answeredCount = questions.filter { $0.answer != nil }.count
        let qaSummary = Self.summarize(questions: questions)

        if answeredCount >= Self.totalQuestions {
            let goals = try await generateFinalGoals(session: session, qaSummary: qaSummary)
            return .done(goals: goals)
        }

        // Ask the next question.
        let nextNumber = answeredCount + 1
        let systemPrompt = """
        You are helping the user set weekly goals. Generate question \(nextNumber) of \(Self.totalQuestions)-6. Make it specific based on previous answers. 5-6 multiple choice options. \(PromptSafety.PREAMBLE)

        Respond with ONLY valid JSON:
        {
          "question": "...",
          "options": ["...", "...", "...", "...", "...", "Other"]
        }
        """
        let userPrompt = PromptSafety.wrap(
            label: "user-input",
            body: "Initial input: \(PromptSafety.sanitize(session.initialInput))\n\nPrevious:\n\(qaSummary)"
        )
        let raw = try await llm.complete(
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            jsonMode: true,
            temperature: 0.7
        )
        let parsed = try Self.parseQuestion(raw)

        questions.append(GoalQuestion(question: parsed.question, options: parsed.options, answer: nil))
        session.encodeQuestions(questions)
        try context.save()

        return .nextQuestion(
            GoalQuestion(question: parsed.question, options: parsed.options),
            questionNumber: nextNumber
        )
    }

    // MARK: - Shuffle

    /// Same answers, different set of generated goals.
    @MainActor
    public func shuffle(session: GoalSession) async throws -> [GoalDraft] {
        let questions = session.decodeQuestions()
        let qaSummary = Self.summarize(questions: questions)

        let systemPrompt = """
        Generate a DIFFERENT set of 4-6 weekly goals based on the same answers. Be creative with alternative approaches. \(PromptSafety.PREAMBLE)

        Respond with ONLY valid JSON:
        {"goals": [{"text": "...", "priority": "URGENT|HIGH|MEDIUM|LOW"}]}
        """
        let userPrompt = PromptSafety.wrap(
            label: "user-input",
            body: "Initial input: \(PromptSafety.sanitize(session.initialInput))\n\n\(qaSummary)"
        )
        let raw = try await llm.complete(
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            jsonMode: true,
            temperature: 0.7
        )
        return try Self.parseGoals(raw)
    }

    // MARK: - Save

    /// Persist drafts as `WeeklyGoal` rows for this week (deactivates any prior
    /// active goals for the same week so the screen reflects the new set).
    @MainActor
    public func save(
        session: GoalSession,
        goals: [GoalDraft],
        context: ModelContext
    ) throws {
        let weekStart = Date().startOfWeekMonday()

        // Deactivate previously active goals for this week so we don't double-show.
        let existing = (try? context.fetch(
            FetchDescriptor<WeeklyGoal>(predicate: #Predicate { $0.active && $0.weekStart == weekStart })
        )) ?? []
        for g in existing { g.active = false }

        for draft in goals {
            let goal = WeeklyGoal(
                text: draft.text,
                priority: draft.priority,
                weekStart: weekStart,
                goalSession: session
            )
            context.insert(goal)
        }

        session.status = .completed
        try context.save()
    }

    // MARK: - LLM final-goal generation

    @MainActor
    private func generateFinalGoals(session: GoalSession, qaSummary: String) async throws -> [GoalDraft] {
        let systemPrompt = """
        Based on the user's answers, generate 4-6 concrete weekly goals with priorities. Be specific and actionable. \(PromptSafety.PREAMBLE)

        Respond with ONLY valid JSON:
        {
          "goals": [
            { "text": "goal description", "priority": "URGENT|HIGH|MEDIUM|LOW" }
          ]
        }
        """
        let userPrompt = PromptSafety.wrap(
            label: "user-input",
            body: "Initial input: \(PromptSafety.sanitize(session.initialInput))\n\n\(qaSummary)"
        )
        let raw = try await llm.complete(
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            jsonMode: true,
            temperature: 0.7
        )
        return try Self.parseGoals(raw)
    }

    // MARK: - Wire shapes

    private struct WireQuestion: Decodable {
        let question: String
        let options: [String]
    }

    private struct WireGoal: Decodable {
        let text: String
        let priority: String
    }

    private struct WireGoals: Decodable {
        let goals: [WireGoal]
    }

    static func parseQuestion(_ raw: String) throws -> (question: String, options: [String]) {
        guard let data = raw.data(using: .utf8) else { throw GoalSessionError.parseFailed }
        let wire = try JSONDecoder().decode(WireQuestion.self, from: data)
        return (wire.question, wire.options)
    }

    static func parseGoals(_ raw: String) throws -> [GoalDraft] {
        guard let data = raw.data(using: .utf8) else { throw GoalSessionError.parseFailed }
        let wire = try JSONDecoder().decode(WireGoals.self, from: data)
        return wire.goals.map { g in
            GoalDraft(text: g.text, priority: Urgency(rawValue: g.priority.uppercased()) ?? .medium)
        }
    }

    // MARK: - Helpers

    /// "Q: ...\nA: ..." block of answered questions, used as the user-message body.
    static func summarize(questions: [GoalQuestion]) -> String {
        questions
            .filter { $0.answer != nil }
            .map { q -> String in
                let raw = q.answer ?? ""
                // Mirror v2: if answer is a 1-based number, swap in the option text.
                let resolved: String
                if let idx = Int(raw), idx >= 1, idx <= q.options.count {
                    resolved = q.options[idx - 1]
                } else {
                    resolved = raw
                }
                return "Q: \(q.question)\nA: \(resolved)"
            }
            .joined(separator: "\n\n")
    }
}

public enum GoalSessionError: LocalizedError {
    case emptyInput
    case emptySession
    case alreadyCompleted
    case parseFailed

    public var errorDescription: String? {
        switch self {
        case .emptyInput:        return "Please describe this week's focus before we begin."
        case .emptySession:      return "Session has no questions yet."
        case .alreadyCompleted:  return "This goal session is already complete."
        case .parseFailed:       return "The model returned a response we couldn't read."
        }
    }
}
