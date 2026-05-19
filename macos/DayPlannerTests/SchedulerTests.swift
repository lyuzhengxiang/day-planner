import XCTest
@testable import DayPlanner

/// Mirrors the tests for `buildMiddayNudgeMessage` / `buildEveningWrapUpMessage`
/// in `tests/` for the Next.js codebase (semantics from `src/lib/cron.ts`).
@MainActor
final class SchedulerTests: XCTestCase {

    private func makeTask(_ text: String, urgency: Urgency = .medium, completed: Bool = false, order: Int = 0) -> Task {
        Task(text: text, urgency: urgency, completed: completed, order: order)
    }

    // MARK: - Midday nudge

    func test_midday_returnsNilWhenNoTasks() {
        XCTAssertNil(Scheduler.buildMiddayNudgeMessage(tasks: []))
    }

    func test_midday_returnsNilWhenHalfOrMoreComplete() {
        let tasks = [
            makeTask("a", completed: true),
            makeTask("b", completed: true),
            makeTask("c", completed: false),
        ]
        XCTAssertNil(Scheduler.buildMiddayNudgeMessage(tasks: tasks))
    }

    func test_midday_callsOutUrgentTask() {
        let tasks = [
            makeTask("write thesis", urgency: .urgent),
            makeTask("buy milk", urgency: .low),
        ]
        let msg = Scheduler.buildMiddayNudgeMessage(tasks: tasks)
        XCTAssertEqual(msg, "You've got 2 tasks left. The urgent one is write thesis.")
    }

    func test_midday_fallsBackToHighIfNoUrgent() {
        let tasks = [
            makeTask("draft PR", urgency: .high),
            makeTask("read book", urgency: .low),
            makeTask("walk", urgency: .medium),
        ]
        let msg = Scheduler.buildMiddayNudgeMessage(tasks: tasks)
        XCTAssertEqual(msg, "You've got 3 tasks left. The urgent one is draft PR.")
    }

    func test_midday_noFocusWhenAllLowOrMedium() {
        let tasks = [
            makeTask("a", urgency: .medium),
            makeTask("b", urgency: .low),
            makeTask("c", urgency: .low),
        ]
        XCTAssertEqual(Scheduler.buildMiddayNudgeMessage(tasks: tasks), "You've got 3 tasks left.")
    }

    // MARK: - Evening wrap-up

    func test_evening_returnsNilWhenAllDone() {
        let tasks = [makeTask("a", completed: true)]
        XCTAssertNil(Scheduler.buildEveningWrapUpMessage(tasks: tasks, appUrl: "http://x"))
    }

    func test_evening_listsRemainingTasksAndLink() {
        let tasks = [
            makeTask("write thesis"),
            makeTask("buy milk", completed: true),
            makeTask("call mom"),
        ]
        let msg = Scheduler.buildEveningWrapUpMessage(tasks: tasks, appUrl: "http://localhost:3000")
        XCTAssertEqual(
            msg,
            "2 still open: write thesis, call mom. Open the app to carry forward or drop: http://localhost:3000"
        )
    }

    // MARK: - Time math

    func test_nextFireDate_skipsToTomorrowIfPassed() {
        let tz = TimeZone(identifier: "America/Chicago")!
        let now = isoDate("2026-05-19T15:00:00", tz: tz)
        let next = Scheduler.nextFireDate(forTimeOfDay: "06:30", in: tz, now: now)
        XCTAssertEqual(next, isoDate("2026-05-20T06:30:00", tz: tz))
    }

    func test_nextFireDate_returnsTodayIfFuture() {
        let tz = TimeZone(identifier: "America/Chicago")!
        let now = isoDate("2026-05-19T05:00:00", tz: tz)
        let next = Scheduler.nextFireDate(forTimeOfDay: "06:30", in: tz, now: now)
        XCTAssertEqual(next, isoDate("2026-05-19T06:30:00", tz: tz))
    }

    func test_nextFireDate_returnsNilForInvalidString() {
        let tz = TimeZone(identifier: "America/Chicago")!
        XCTAssertNil(Scheduler.nextFireDate(forTimeOfDay: "ten thirty", in: tz, now: Date()))
        XCTAssertNil(Scheduler.nextFireDate(forTimeOfDay: "25:00", in: tz, now: Date()))
    }

    // MARK: - Helpers

    private func isoDate(_ s: String, tz: TimeZone) -> Date {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        df.timeZone = tz
        return df.date(from: s)!
    }
}
