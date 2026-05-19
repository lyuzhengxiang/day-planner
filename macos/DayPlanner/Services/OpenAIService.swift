import Foundation
import OpenAI

/// `LLMService` implementation backed by `MacPaw/OpenAI`.
/// Configured for `gpt-5.4` with up to 3 retries on transient failures.
public final class OpenAIService: LLMService {
    private let modelName: String
    private let maxRetries: Int

    public init(modelName: String = "gpt-5.4", maxRetries: Int = 3) {
        self.modelName = modelName
        self.maxRetries = maxRetries
    }

    public func complete(
        prompt: String,
        jsonMode: Bool,
        temperature: Double
    ) async throws -> String {
        guard let apiKey = KeychainStore.get(.openAI), !apiKey.isEmpty else {
            throw LLMError.missingAPIKey
        }

        let openAI = OpenAI(apiToken: apiKey)
        let messages: [ChatQuery.ChatCompletionMessageParam] = [
            .user(.init(content: .string(prompt)))
        ]
        let query = ChatQuery(
            messages: messages,
            model: .init(modelName),
            responseFormat: jsonMode ? .jsonObject : nil,
            temperature: temperature
        )

        var attempt = 0
        var lastError: Error?
        while attempt < maxRetries {
            do {
                let result = try await openAI.chats(query: query)
                let content = result.choices.first?.message.content ?? ""
                if content.isEmpty {
                    throw LLMError.emptyResponse
                }
                return content
            } catch {
                lastError = error
                attempt += 1
                if attempt < maxRetries {
                    let backoffNS = UInt64(pow(2.0, Double(attempt))) * 1_000_000_000
                    try? await _Concurrency.Task.sleep(nanoseconds: backoffNS)
                }
            }
        }

        throw LLMError.providerError(underlying: lastError ?? LLMError.emptyResponse)
    }
}
