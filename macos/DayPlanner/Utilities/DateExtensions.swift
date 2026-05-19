import Foundation

public extension Date {
    /// Beginning of the day (00:00:00) in the given calendar/timezone.
    /// Default uses the user's current calendar.
    func startOfDay(in calendar: Calendar = .current) -> Date {
        calendar.startOfDay(for: self)
    }

    /// Monday of the week containing this date (or Sunday, depending on calendar.firstWeekday).
    /// We force `firstWeekday = 2` (Monday) to match the original Prisma `weekStart` semantics.
    func startOfWeekMonday(in timezone: TimeZone = .current) -> Date {
        var cal = Calendar(identifier: .iso8601)
        cal.firstWeekday = 2
        cal.timeZone = timezone
        let components = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)
        return cal.date(from: components) ?? self
    }
}

public enum DateFormatters {
    /// "Tuesday, April 1, 2026"
    public static let humanLong: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "EEEE, MMMM d, yyyy"
        df.locale = Locale(identifier: "en_US")
        return df
    }()

    /// "2026-04-01" used for markdown file names and history routes.
    public static let isoDate: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.locale = Locale(identifier: "en_US_POSIX")
        return df
    }()

    /// "HH:mm" — for parsing user-entered settings times.
    public static let timeOfDay: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "HH:mm"
        df.locale = Locale(identifier: "en_US_POSIX")
        return df
    }()
}
