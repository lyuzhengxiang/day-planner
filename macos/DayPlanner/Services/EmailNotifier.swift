import Foundation

/// Sends transactional email via the Resend API.
/// Mirrors the Resend usage from `src/lib/notifications.ts`.
public struct EmailNotifier: Sendable {
    public init() {}

    public func send(
        to recipient: String,
        subject: String,
        text: String
    ) async -> Bool {
        guard let apiKey = KeychainStore.get(.resend), !apiKey.isEmpty else {
            return false
        }
        guard let url = URL(string: "https://api.resend.com/emails") else { return false }

        let payload: [String: Any] = [
            "from": "Day Planner <onboarding@resend.dev>",
            "to": recipient,
            "subject": subject,
            "text": text,
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else {
            return false
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = body

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                return true
            }
            return false
        } catch {
            print("[EmailNotifier] request failed: \(error)")
            return false
        }
    }
}
