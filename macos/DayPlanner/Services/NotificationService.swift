import Foundation
import SwiftData

/// Orchestrates delivery: try iMessage first, fall back to email on failure or if
/// iMessage isn't configured. Mirrors `notify()` from `src/lib/notifications.ts`.
public struct NotificationService: Sendable {
    public struct Result: Sendable {
        public let attempted: Bool
        public let iMessage: Bool
        public let email: Bool
    }

    private let iMessage: AppleScriptNotifier
    private let email: EmailNotifier

    public init(
        iMessage: AppleScriptNotifier = AppleScriptNotifier(),
        email: EmailNotifier = EmailNotifier()
    ) {
        self.iMessage = iMessage
        self.email = email
    }

    @MainActor
    public func notify(
        context: ModelContext,
        message: String,
        subject: String = "Day Planner"
    ) async -> Result {
        let settings = (try? context.fetch(FetchDescriptor<AppSettings>()))?.first
        let phone = settings?.iMessagePhone.trimmingCharacters(in: .whitespaces) ?? ""
        let mail = settings?.emailAddress.trimmingCharacters(in: .whitespaces) ?? ""

        if phone.isEmpty && mail.isEmpty {
            return Result(attempted: false, iMessage: false, email: false)
        }

        var iMessageSent = false
        if !phone.isEmpty {
            iMessageSent = await iMessage.send(message: message, toPhone: phone)
        }

        var emailSent = false
        // Email is a fallback — only send if iMessage was not configured or failed.
        if !mail.isEmpty && !iMessageSent {
            emailSent = await email.send(to: mail, subject: subject, text: message)
        }

        return Result(attempted: true, iMessage: iMessageSent, email: emailSent)
    }
}
