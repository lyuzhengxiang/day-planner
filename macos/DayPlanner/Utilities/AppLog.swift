import Foundation
import OSLog

/// Central logging shim. Replaces ad-hoc `print()` calls so all log records
/// route through `os.Logger` with a stable subsystem and per-service category.
///
/// SECURITY: API keys, phone numbers, and email addresses are formatted with
/// the `.private` privacy specifier (the default for `String` interpolations
/// in `os.Logger`). They appear as `<private>` in Console.app captures and
/// `log show`, unless the host opts into private-data exposure for the
/// subsystem.
public enum AppLog {
    public static let subsystem = "com.lyuzhengxiang.dayplanner"

    public static let plan = Logger(subsystem: subsystem, category: "plan-generator")
    public static let reflection = Logger(subsystem: subsystem, category: "reflection")
    public static let notification = Logger(subsystem: subsystem, category: "notification")
    public static let openai = Logger(subsystem: subsystem, category: "openai")
    public static let weather = Logger(subsystem: subsystem, category: "weather")
    public static let appleScript = Logger(subsystem: subsystem, category: "applescript")
    public static let data = Logger(subsystem: subsystem, category: "data-controller")
    public static let scheduler = Logger(subsystem: subsystem, category: "scheduler")
    public static let intent = Logger(subsystem: subsystem, category: "app-intent")
    public static let ui = Logger(subsystem: subsystem, category: "ui")
}
