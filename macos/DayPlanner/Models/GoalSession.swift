import Foundation
import SwiftData

/// Temporary state for the weekly goal interview flow.
/// Mirrors `GoalSession` from the Prisma schema.
@Model
public final class GoalSession {
    public var initialInput: String = ""
    /// JSON-encoded array of `{question, options, answer}` objects.
    /// Stored as a string to mirror the Prisma schema and to keep SwiftData simple.
    public var questionsJSON: String = "[]"
    public var statusRaw: String = GoalSessionStatus.inProgress.rawValue
    public var createdAt: Date = Date()

    public var weeklyGoals: [WeeklyGoal]? = []

    public var status: GoalSessionStatus {
        get { GoalSessionStatus(rawValue: statusRaw) ?? .inProgress }
        set { statusRaw = newValue.rawValue }
    }

    public init(initialInput: String, questionsJSON: String = "[]") {
        self.initialInput = initialInput
        self.questionsJSON = questionsJSON
    }
}

/// Wire type carried inside `questionsJSON`.
public struct GoalQuestion: Codable, Equatable, Sendable {
    public var question: String
    public var options: [String]
    public var answer: String?

    public init(question: String, options: [String], answer: String? = nil) {
        self.question = question
        self.options = options
        self.answer = answer
    }
}

public extension GoalSession {
    func decodeQuestions() -> [GoalQuestion] {
        guard let data = questionsJSON.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([GoalQuestion].self, from: data)
        else { return [] }
        return decoded
    }

    func encodeQuestions(_ questions: [GoalQuestion]) {
        guard let data = try? JSONEncoder().encode(questions),
              let string = String(data: data, encoding: .utf8)
        else { return }
        questionsJSON = string
    }
}
