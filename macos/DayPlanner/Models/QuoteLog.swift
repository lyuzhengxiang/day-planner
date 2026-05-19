import Foundation
import SwiftData

/// Tracks recent quotes to enforce the 30-day no-repeat rule.
/// Mirrors `QuoteLog` from the Prisma schema.
@Model
public final class QuoteLog {
    public var quoteText: String = ""
    public var usedOn: Date = Date()

    public init(quoteText: String, usedOn: Date = Date()) {
        self.quoteText = quoteText
        self.usedOn = usedOn
    }
}
