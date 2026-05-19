import SwiftUI

struct QuoteBanner: View {
    let quote: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("“")
                .font(.system(size: 26, weight: .light, design: .serif))
                .foregroundStyle(.secondary)
            Text(quote)
                .font(.system(.body, design: .monospaced).italic())
                .foregroundStyle(.primary)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color(red: 0.55, green: 0.85, blue: 0.55).opacity(0.4), lineWidth: 1)
        )
    }
}
