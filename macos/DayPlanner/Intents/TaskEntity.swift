import AppIntents
import Foundation
import SwiftData

/// AppIntents-side wrapper around `Task`. Siri / Shortcuts refer to tasks
/// through this entity; we resolve back to the SwiftData model via an
/// encoded form of `PersistentIdentifier`.
///
/// `PersistentIdentifier` is Codable but not `EntityIdentifierConvertible`,
/// so we encode it as a base64 JSON string for use as `AppEntity.ID`.
struct TaskEntity: AppEntity, Identifiable, Sendable {
    typealias DefaultQuery = TaskEntityQuery

    var id: String          // encoded PersistentIdentifier
    var text: String
    var urgencyRaw: String
    var completed: Bool

    var urgency: Urgency { Urgency(rawValue: urgencyRaw) ?? .medium }

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(name: "Task")
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(text)",
            subtitle: "\(urgencyRaw)\(completed ? " · done" : "")"
        )
    }

    static var defaultQuery = TaskEntityQuery()

    init(model: Task) {
        self.id = TaskEntity.encode(model.persistentModelID)
        self.text = model.text
        self.urgencyRaw = model.urgencyRaw
        self.completed = model.completed
    }

    // MARK: - PersistentIdentifier ↔ String

    static func encode(_ pid: PersistentIdentifier) -> String {
        (try? JSONEncoder().encode(pid))?.base64EncodedString() ?? ""
    }

    static func decode(_ s: String) -> PersistentIdentifier? {
        guard let data = Data(base64Encoded: s) else { return nil }
        return try? JSONDecoder().decode(PersistentIdentifier.self, from: data)
    }
}

struct TaskEntityQuery: EntityQuery, EntityStringQuery, Sendable {
    @MainActor
    func entities(for identifiers: [String]) async throws -> [TaskEntity] {
        let context = ModelContext(DataController.shared.container)
        return identifiers.compactMap { id -> TaskEntity? in
            guard let pid = TaskEntity.decode(id),
                  let model = context.model(for: pid) as? Task else { return nil }
            return TaskEntity(model: model)
        }
    }

    @MainActor
    func suggestedEntities() async throws -> [TaskEntity] {
        await TaskEntity.todays()
    }

    /// Substring, case-insensitive match against today's tasks.
    @MainActor
    func entities(matching string: String) async throws -> [TaskEntity] {
        let needle = string.lowercased()
        let candidates = await TaskEntity.todays()
        return candidates.filter { $0.text.lowercased().contains(needle) }
    }
}

extension TaskEntity {
    /// Today's plan tasks, ordered. Public so intents can reuse it.
    @MainActor
    static func todays() async -> [TaskEntity] {
        let context = ModelContext(DataController.shared.container)
        let start = Date().startOfDay()
        let descriptor = FetchDescriptor<DailyPlan>(predicate: #Predicate { $0.date == start })
        guard let plan = try? context.fetch(descriptor).first else { return [] }
        return (plan.tasks ?? [])
            .sorted { $0.order < $1.order }
            .map(TaskEntity.init(model:))
    }
}
