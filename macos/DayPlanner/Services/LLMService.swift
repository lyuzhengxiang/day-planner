import Foundation

// MARK: - Protocol

/// Abstraction over the LLM provider. Swapping providers (or mocking in tests)
/// happens by injecting a different implementation.
///
/// Designed to leave room for future agentic methods (tools / streaming) without
/// rewiring the call sites that just need a one-shot completion.
///
/// SECURITY: callers that include user-controlled content should pass it as the
/// `userPrompt` (role=user), keeping rules and the `PromptSafety.PREAMBLE` in
/// `systemPrompt` (role=system). The role split is the second layer of
/// prompt-injection defense behind sanitization in `PromptSafety.swift`.
public protocol LLMService: Sendable {
    /// Two-message completion: a system message carrying rules, a user message
    /// carrying (sanitized) data. `systemPrompt` may be `nil` for backward
    /// compatibility with single-message callers.
    func complete(
        systemPrompt: String?,
        userPrompt: String,
        jsonMode: Bool,
        temperature: Double
    ) async throws -> String
}

public extension LLMService {
    /// Single-string convenience. Equivalent to passing the whole prompt as
    /// the user message — only use when there is no user-controlled content.
    func complete(prompt: String) async throws -> String {
        try await complete(
            systemPrompt: nil,
            userPrompt: prompt,
            jsonMode: false,
            temperature: 0.7
        )
    }

    /// Backward-compatible single-string completion with options.
    func complete(
        prompt: String,
        jsonMode: Bool,
        temperature: Double
    ) async throws -> String {
        try await complete(
            systemPrompt: nil,
            userPrompt: prompt,
            jsonMode: jsonMode,
            temperature: temperature
        )
    }
}

// MARK: - Errors

public enum LLMError: LocalizedError {
    case missingAPIKey
    case emptyResponse
    case providerError(underlying: Error)

    public var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Missing OpenAI API key. Set it in Settings or via the OPENAI_API_KEY environment variable."
        case .emptyResponse:
            return "The model returned an empty response."
        case .providerError(let underlying):
            return "OpenAI request failed: \(underlying.localizedDescription)"
        }
    }
}
