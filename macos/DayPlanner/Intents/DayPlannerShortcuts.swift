import AppIntents

/// Registers the default invocation phrases for each AppIntent so they show
/// up in the Shortcuts app and Spotlight without manual user configuration.
struct DayPlannerShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TodayPlanIntent(),
            phrases: [
                "Show today's plan in \(.applicationName)",
                "What's my plan in \(.applicationName)",
                "Read my \(.applicationName) plan",
            ],
            shortTitle: "Today's plan",
            systemImageName: "sun.max"
        )
        AppShortcut(
            intent: NextTaskIntent(),
            phrases: [
                "What's next in \(.applicationName)",
                "Next task in \(.applicationName)",
            ],
            shortTitle: "Next task",
            systemImageName: "arrow.right.circle"
        )
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: [
                "Add a task to \(.applicationName)",
                "Add task in \(.applicationName)",
            ],
            shortTitle: "Add task",
            systemImageName: "plus.circle"
        )
        AppShortcut(
            intent: CompleteTaskIntent(),
            phrases: [
                "Complete a task in \(.applicationName)",
                "Mark task done in \(.applicationName)",
            ],
            shortTitle: "Complete task",
            systemImageName: "checkmark.circle"
        )
        AppShortcut(
            intent: GenerateTodayPlanIntent(),
            phrases: [
                "Generate today's plan in \(.applicationName)",
                "Make my plan in \(.applicationName)",
            ],
            shortTitle: "Generate plan",
            systemImageName: "sparkles"
        )
        AppShortcut(
            intent: MorningRoutineIntent(),
            phrases: [
                "Run my morning routine in \(.applicationName)",
                "Start my morning routine in \(.applicationName)",
                "Start my morning in \(.applicationName)",
                "It's morning in \(.applicationName)",
                "Good morning \(.applicationName)",
                "Wake me up in \(.applicationName)",
                "Show me my morning in \(.applicationName)",
                "Show me what you're going to do in \(.applicationName)",
            ],
            shortTitle: "Morning routine",
            systemImageName: "sunrise.fill"
        )
    }
}
