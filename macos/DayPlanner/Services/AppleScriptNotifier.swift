import Foundation

/// Sends an iMessage by shelling out to `osascript`. The user is prompted
/// on first run for "DayPlanner wants to control Messages" — required permission.
///
/// Mirrors the AppleScript from `src/lib/notifications.ts`.
public struct AppleScriptNotifier: Sendable {
    public init() {}

    /// Returns `true` on successful delivery to Messages.app's outbox.
    /// "Successful" does NOT guarantee the recipient received the iMessage —
    /// AppleScript reports success even when the buddy is unreachable.
    public func send(message: String, toPhone phone: String) async -> Bool {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let result = Self.execOsascript(phone: phone, message: message)
                continuation.resume(returning: result)
            }
        }
    }

    private static func execOsascript(phone: String, message: String) -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = scriptArguments(phone: phone, message: message)

        let stderr = Pipe()
        process.standardError = stderr
        process.standardOutput = Pipe()

        do {
            try process.run()
            process.waitUntilExit()
            if process.terminationStatus == 0 {
                return true
            }
            let data = stderr.fileHandleForReading.readDataToEndOfFile()
            let errString = String(data: data, encoding: .utf8) ?? ""
            AppLog.appleScript.error("osascript exit \(process.terminationStatus, privacy: .public): \(errString, privacy: .public)")
            return false
        } catch {
            AppLog.appleScript.error("failed to launch osascript: \(String(describing: error), privacy: .public)")
            return false
        }
    }

    /// Public for testing.
    public static func scriptArguments(phone: String, message: String) -> [String] {
        [
            "-e", "on run argv",
            "-e", "set targetBuddy to item 1 of argv as text",
            "-e", "set outgoingMessage to item 2 of argv as text",
            "-e", "tell application \"Messages\"",
            "-e", "set targetService to 1st account whose service type = iMessage",
            "-e", "send outgoingMessage to buddy targetBuddy of targetService",
            "-e", "end tell",
            "-e", "end run",
            phone,
            message,
        ]
    }
}
