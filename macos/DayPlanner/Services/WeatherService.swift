import Foundation

/// Fetches the current weather summary for Chicago from WeatherAPI.com.
/// Falls back to "Weather unavailable" if the API key is missing or the
/// request fails — never blocking plan generation.
public struct WeatherService: Sendable {
    public init() {}

    public func fetchCurrent(location: String = "Chicago") async -> String {
        guard let apiKey = KeychainStore.get(.weather), !apiKey.isEmpty else {
            return "Weather unavailable"
        }
        guard let escaped = location.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://api.weatherapi.com/v1/current.json?key=\(apiKey)&q=\(escaped)&aqi=no")
        else {
            return "Weather unavailable"
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoded = try JSONDecoder().decode(WeatherAPIResponse.self, from: data)
            let tempF = Int(decoded.current.temp_f.rounded())
            return "\(tempF)°F, \(decoded.current.condition.text)"
        } catch {
            return "Weather unavailable"
        }
    }
}

private struct WeatherAPIResponse: Decodable {
    struct Current: Decodable {
        struct Condition: Decodable { let text: String }
        let temp_f: Double
        let condition: Condition
    }
    let current: Current
}
