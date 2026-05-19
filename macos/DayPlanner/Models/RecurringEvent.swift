import Foundation
import SwiftData

/// Fixed time blocks injected into the day (e.g., classes, meetings).
/// Mirrors `RecurringEvent` from the Prisma schema.
@Model
public final class RecurringEvent {
    public var title: String = ""
    /// Comma-separated days of week, "0,1,2..." where 0=Sun..6=Sat.
    public var daysOfWeek: String = ""
    /// "HH:mm" 24-hour format.
    public var startTime: String = "09:00"
    public var endTime: String = "10:00"
    public var active: Bool = true
    public var createdAt: Date = Date()
    public var updatedAt: Date = Date()

    public init(
        title: String,
        daysOfWeek: String,
        startTime: String,
        endTime: String,
        active: Bool = true
    ) {
        self.title = title
        self.daysOfWeek = daysOfWeek
        self.startTime = startTime
        self.endTime = endTime
        self.active = active
    }

    /// Decoded set of weekday integers (Calendar uses 1-7 with Sun=1; we store 0-6 with Sun=0).
    public var weekdaySet: Set<Int> {
        Set(
            daysOfWeek
                .split(separator: ",")
                .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
        )
    }

    public func occursOn(date: Date, calendar: Calendar = .current) -> Bool {
        // Calendar.component(.weekday) returns 1-7 (Sun=1). Convert to 0-6.
        let weekday = calendar.component(.weekday, from: date) - 1
        return weekdaySet.contains(weekday)
    }
}
