import XCTest
import SwiftData
@testable import DayPlanner

final class ModelsTests: XCTestCase {
    /// Creates an in-memory container so tests don't touch real Application Support.
    func makeContainer() throws -> ModelContainer {
        let schema = Schema(DataController.schemaTypes)
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(for: schema, configurations: [config])
    }

    @MainActor
    func test_insertSettings_returnsRow() throws {
        let container = try makeContainer()
        let context = container.mainContext
        context.insert(AppSettings(iMessagePhone: "+15555555555"))
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<AppSettings>())
        XCTAssertEqual(fetched.count, 1)
        XCTAssertEqual(fetched.first?.iMessagePhone, "+15555555555")
        XCTAssertFalse(fetched.first?.needsContactSetup ?? true)
    }

    @MainActor
    func test_dailyPlanWithTasks_cascadeDeletes() throws {
        let container = try makeContainer()
        let context = container.mainContext

        let plan = DailyPlan(date: Date(), quote: "test", weatherSummary: "sunny")
        context.insert(plan)
        let t1 = Task(text: "do stuff", dailyPlan: plan)
        let t2 = Task(text: "more stuff", dailyPlan: plan)
        context.insert(t1)
        context.insert(t2)
        try context.save()

        XCTAssertEqual(try context.fetch(FetchDescriptor<Task>()).count, 2)

        context.delete(plan)
        try context.save()
        XCTAssertEqual(try context.fetch(FetchDescriptor<Task>()).count, 0)
    }

    func test_urgencyOrdering() {
        XCTAssertLessThan(Urgency.urgent, Urgency.high)
        XCTAssertLessThan(Urgency.high, Urgency.medium)
        XCTAssertLessThan(Urgency.medium, Urgency.low)
    }

    func test_recurringEventWeekdaySet() {
        let event = RecurringEvent(
            title: "CS 101",
            daysOfWeek: "1,3,5",
            startTime: "09:00",
            endTime: "10:30"
        )
        XCTAssertEqual(event.weekdaySet, [1, 3, 5])
    }

    func test_goalSession_questionsRoundTrip() {
        let session = GoalSession(initialInput: "ship landing page")
        let q = [
            GoalQuestion(question: "How many hours per day?", options: ["2", "4", "6", "8"]),
            GoalQuestion(question: "Main blocker?", options: ["focus", "scope", "energy"], answer: "focus"),
        ]
        session.encodeQuestions(q)
        XCTAssertEqual(session.decodeQuestions(), q)
    }
}
