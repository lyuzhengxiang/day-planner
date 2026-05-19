import Foundation
import SwiftData

/// Picks a daily quote from `quotes.json`, respecting the 30-day no-repeat rule
/// enforced via `QuoteLog`. Falls back to any quote if the pool is exhausted.
public struct QuoteService: Sendable {
    public struct QuoteEntry: Decodable, Sendable {
        public let text: String
        public let theme: String
    }

    public init() {}

    /// Loads the bundled `quotes.json`. Returns an empty list if the resource is missing
    /// (which only happens if XcodeGen wasn't run or the resource was excluded).
    public func loadAll() -> [QuoteEntry] {
        guard let url = Bundle.main.url(forResource: "quotes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([QuoteEntry].self, from: data)
        else {
            return []
        }
        return decoded
    }

    /// Picks a quote excluding ones used in the past 30 days. Records the pick to `QuoteLog`.
    @MainActor
    public func pick(context: ModelContext, today: Date = Date()) -> String {
        let all = loadAll().map(\.text)
        guard !all.isEmpty else { return "Build something today." }

        let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: today) ?? today
        let recentDescriptor = FetchDescriptor<QuoteLog>(
            predicate: #Predicate { $0.usedOn >= cutoff }
        )
        let recent = (try? context.fetch(recentDescriptor)) ?? []
        let usedTexts = Set(recent.map(\.quoteText))

        let pool = all.filter { !usedTexts.contains($0) }
        let chosen = pool.randomElement() ?? all.randomElement() ?? all[0]

        context.insert(QuoteLog(quoteText: chosen, usedOn: today))
        try? context.save()
        return chosen
    }
}
