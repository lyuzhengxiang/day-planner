import Foundation

/// Exports a daily plan to `~/Documents/DayPlanner/days/YYYY-MM-DD.md`.
/// Mirrors the Markdown shape from the original `src/lib/markdown.ts`.
public struct MarkdownExporter: Sendable {
    public struct ScheduleItem: Sendable {
        public let title: String
        public let startTime: String
        public let endTime: String

        public init(title: String, startTime: String, endTime: String) {
            self.title = title
            self.startTime = startTime
            self.endTime = endTime
        }
    }

    public struct TaskItem: Sendable {
        public let text: String
        public let urgency: Urgency
        public let completed: Bool
        public let rolledOver: Bool

        public init(text: String, urgency: Urgency, completed: Bool, rolledOver: Bool) {
            self.text = text
            self.urgency = urgency
            self.completed = completed
            self.rolledOver = rolledOver
        }
    }

    public init() {}

    @discardableResult
    public func export(
        date: Date,
        weather: String,
        quote: String,
        schedule: [ScheduleItem],
        tasks: [TaskItem]
    ) -> String {
        let body = render(
            date: date,
            weather: weather,
            quote: quote,
            schedule: schedule,
            tasks: tasks
        )

        let directory = outputDirectory()
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let filename = DateFormatters.isoDate.string(from: date) + ".md"
        let path = directory.appendingPathComponent(filename)
        try? body.data(using: .utf8)?.write(to: path)
        return path.path
    }

    /// Public for testing.
    public func render(
        date: Date,
        weather: String,
        quote: String,
        schedule: [ScheduleItem],
        tasks: [TaskItem]
    ) -> String {
        let header = "# \(DateFormatters.humanLong.string(from: date))"
        let weatherLine = "> Chicago — \(weather)"
        let quoteLine = "> \"\(quote)\""

        let scheduleSection: String
        if schedule.isEmpty {
            scheduleSection = ""
        } else {
            let lines = schedule.map { "- \($0.startTime)–\($0.endTime) \($0.title) (recurring)" }
            scheduleSection = "\n## Schedule\n" + lines.joined(separator: "\n") + "\n"
        }

        let taskLines = tasks.map { task -> String in
            let box = task.completed ? "[x]" : "[ ]"
            let urgency = "`\(task.urgency.rawValue)`"
            let rolledNote = task.rolledOver ? " *(rolled from yesterday)*" : ""
            return "- \(box) \(task.text) \(urgency)\(rolledNote)"
        }
        let tasksSection = "\n## Tasks\n" + taskLines.joined(separator: "\n")

        let completed = tasks.filter(\.completed).count
        let total = tasks.count
        let percent = total > 0 ? Int(Double(completed) / Double(total) * 100) : 0
        let barWidth = 16
        let filled = total > 0 ? Int(Double(completed) / Double(total) * Double(barWidth)) : 0
        let bar = String(repeating: "█", count: filled) + String(repeating: "░", count: barWidth - filled)
        let progressSection = "\n## Progress\n\(bar) \(completed)/\(total) (\(percent)%)\n"

        return [header, weatherLine, "", quoteLine, scheduleSection, tasksSection, progressSection]
            .joined(separator: "\n")
    }

    private func outputDirectory() -> URL {
        let fm = FileManager.default
        let docs = (try? fm.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true))
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Documents")
        return docs.appendingPathComponent("DayPlanner/days", isDirectory: true)
    }
}
