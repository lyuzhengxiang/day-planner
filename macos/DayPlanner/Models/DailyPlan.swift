import Foundation
import SwiftData

/// Per-day generated plan metadata.
/// Mirrors `DailyPlan` from the Prisma schema. `date` is unique.
@Model
public final class DailyPlan {
    @Attribute(.unique) public var date: Date = Date()
    public var quote: String = ""
    public var weatherSummary: String = ""
    public var markdownPath: String = ""
    public var streakCount: Int = 0
    public var createdAt: Date = Date()
    public var updatedAt: Date = Date()

    @Relationship(deleteRule: .cascade, inverse: \Task.dailyPlan)
    public var tasks: [Task]? = []

    public init(
        date: Date,
        quote: String,
        weatherSummary: String,
        markdownPath: String = "",
        streakCount: Int = 0
    ) {
        self.date = date
        self.quote = quote
        self.weatherSummary = weatherSummary
        self.markdownPath = markdownPath
        self.streakCount = streakCount
    }
}
