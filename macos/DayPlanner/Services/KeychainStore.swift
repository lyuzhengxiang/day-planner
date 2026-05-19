import Foundation
import Security

/// Stores API keys in the macOS Keychain rather than UserDefaults or a `.env` file.
/// Each value is stored as a `kSecClassGenericPassword` keyed by a constant `account` string.
public enum KeychainStore {
    public enum Key: String, CaseIterable {
        case openAI = "OPENAI_API_KEY"
        case weather = "WEATHER_API_KEY"
        case resend = "RESEND_API_KEY"
    }

    private static let service = "com.lyuzhengxiang.dayplanner"

    // MARK: - Public API

    public static func set(_ value: String, for key: Key) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            delete(key)
            return
        }
        save(trimmed, account: key.rawValue)
    }

    public static func get(_ key: Key) -> String? {
        if let envOverride = ProcessInfo.processInfo.environment[key.rawValue],
           !envOverride.isEmpty {
            // Env-var override is useful for Xcode scheme-based development.
            return envOverride
        }
        return load(account: key.rawValue)
    }

    public static func delete(_ key: Key) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Implementation

    private static func save(_ value: String, account: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let attributes: [String: Any] = [
            kSecValueData as String: data,
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var add = query
            add[kSecValueData as String] = data
            SecItemAdd(add as CFDictionary, nil)
        }
    }

    private static func load(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8)
        else { return nil }
        return value
    }
}
