import SwiftUI

struct WeatherCard: View {
    let summary: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(.blue.opacity(0.8))
            Text(summary.isEmpty ? "Weather unavailable" : summary)
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.primary)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(10)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.secondary.opacity(0.25), lineWidth: 1)
        )
    }

    private var icon: String {
        let lower = summary.lowercased()
        if lower.contains("rain") || lower.contains("drizzle") { return "cloud.rain" }
        if lower.contains("snow") { return "cloud.snow" }
        if lower.contains("storm") || lower.contains("thunder") { return "cloud.bolt" }
        if lower.contains("cloud") || lower.contains("overcast") { return "cloud" }
        if lower.contains("clear") || lower.contains("sun") { return "sun.max" }
        if lower.contains("fog") || lower.contains("mist") { return "cloud.fog" }
        return "thermometer.sun"
    }
}
