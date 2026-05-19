import Foundation

// MARK: - Protocol

/// Abstraction over the LLM provider. Swapping providers (or mocking in tests)
/// happens by injecting a different implementation.
///
/// Designed to leave room for future agentic methods (tools / streaming) without
/// rewiring the call sites that just need a one-shot completion.
public protocol LLMService: Sendable {
    /// Single-turn completion. Returns the raw assistant message content.
    func complete(
        prompt: String,
        jsonMode: Bool,
        temperature: Double
    ) async throws -> String
}

public extension LLMService {
    func complete(prompt: String) async throws -> String {
        try await complete(prompt: prompt, jsonMode: false, temperature: 0.7)
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
