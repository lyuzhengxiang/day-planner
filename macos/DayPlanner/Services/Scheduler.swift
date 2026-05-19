import Foundation
import SwiftData

/// Replaces `src/lib/cron.ts`. Fires four recurring jobs driven by `AppSettings`:
///
/// - `morningTime` daily — generate today's plan (sends its own notification)
/// - `middayTime` daily — midday nudge if <50% complete and tasks remain
/// - `eveningTime` daily — evening wrap-up if tasks remain
/// - Sunday 18:00 — weekly reflection
///
/// We don't use `DispatchSourceTimer` because we need wall-clock semantics
/// (specific HH:mm in the user's timezone), not interval semantics. Each job
/// schedules a `Timer` for its next fire date, runs, then reschedules itself.
@MainActor
public final class Scheduler {
    public static let shared = Scheduler()

    private let container: ModelContainer
    private let planGenerator: PlanGenerator
    private let reflection: ReflectionService
    private let notifications: NotificationService

    /// Indexed by job kind so `reload()` can replace them.
    private var timers: [JobKind: Timer] = [:]

    private enum JobKind: String, CaseIterable {
        case morning
        case midday
        case evening
        case weeklyReflection
    }

    public init(
        container: ModelContainer = DataController.shared.container,
        planGenerator: PlanGenerator = PlanGenerator(),
        reflection: ReflectionService = ReflectionService(),
        notifications: NotificationService = NotificationService()
    ) {
        self.container = container
        self.planGenerator = planGenerator
        self.reflection = reflection
        self.notifications = notifications
    }

    // MARK: - Public API

    /// Idempotent — call once on app launch.
    public func start() {
        guard !isDisabled else {
            AppLog.scheduler.info("Scheduler disabled via DISABLE_DAY_PLANNER_CRON")
            return
        }
        reload()
    }

    /// Cancel all jobs and reschedule from the latest settings. Call after
    /// the user edits times in Settings.
    public func reload() {
        stop()
        let settings = currentSettings()
        let tz = TimeZone(identifier: settings.timezone) ?? .current

        schedule(.morning, at: settings.morningTime, timezone: tz)
        schedule(.midday, at: settings.middayTime, timezone: tz)
        schedule(.evening, at: settings.eveningTime, timezone: tz)
        scheduleWeekly(.weeklyReflection, weekday: 1, hour: 18, minute: 0, timezone: tz) // 1 = Sunday

        AppLog.scheduler.info(
            "Scheduler reloaded — morning=\(settings.morningTime, privacy: .public), midday=\(settings.middayTime, privacy: .public), evening=\(settings.eveningTime, privacy: .public), tz=\(settings.timezone, privacy: .public)"
        )
    }

    public func stop() {
        for timer in timers.values { timer.invalidate() }
        timers.removeAll()
    }

    // MARK: - Scheduling primitives

    private func schedule(_ kind: JobKind, at hhmm: String, timezone: TimeZone) {
        guard let next = Self.nextFireDate(forTimeOfDay: hhmm, in: timezone) else {
            AppLog.scheduler.error("Invalid time string \(hhmm, privacy: .public) for \(kind.rawValue, privacy: .public)")
            return
        }
        installTimer(for: kind, at: next, timezone: timezone, isWeekly: false)
    }

    private func scheduleWeekly(
        _ kind: JobKind,
        weekday: Int,
        hour: Int,
        minute: Int,
        timezone: TimeZone
    ) {
        guard let next = Self.nextWeeklyFireDate(weekday: weekday, hour: hour, minute: minute, in: timezone) else {
            AppLog.scheduler.error("Failed to compute next fire for \(kind.rawValue, privacy: .public)")
            return
        }
        installTimer(for: kind, at: next, timezone: timezone, isWeekly: true)
    }

    private func installTimer(for kind: JobKind, at fireDate: Date, timezone: TimeZone, isWeekly: Bool) {
        let timer = Timer(fire: fireDate, interval: 0, repeats: false) { [weak self] _ in
            guard let self else { return }
            // Hop to the main actor to satisfy @MainActor requirements on services.
            MainActor.assumeIsolated {
                self.timers.removeValue(forKey: kind)
                self.run(kind)
                // Reschedule for the next occurrence.
                if isWeekly {
                    self.scheduleWeekly(kind, weekday: 1, hour: 18, minute: 0, timezone: timezone)
                } else {
                    let settings = self.currentSettings()
                    let hhmm: String
                    switch kind {
                    case .morning: hhmm = settings.morningTime
                    case .midday: hhmm = settings.middayTime
                    case .evening: hhmm = settings.eveningTime
                    case .weeklyReflection: return
                    }
                    self.schedule(kind, at: hhmm, timezone: timezone)
                }
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        timers[kind] = timer

        AppLog.scheduler.debug(
            "Scheduled \(kind.rawValue, privacy: .public) at \(fireDate.description, privacy: .public)"
        )
    }

    // MARK: - Job implementations

    private func run(_ kind: JobKind) {
        AppLog.scheduler.info("Firing \(kind.rawValue, privacy: .public)")
        switch kind {
        case .morning:
            _Concurrency.Task { await self.runMorning() }
        case .midday:
            _Concurrency.Task { await self.runMidday() }
        case .evening:
            _Concurrency.Task { await self.runEvening() }
        case .weeklyReflection:
            _Concurrency.Task { await self.runWeeklyReflection() }
        }
    }

    private func runMorning() async {
        let ctx = ModelContext(container)
        do {
            _ = try await planGenerator.generate(context: ctx)
        } catch {
            AppLog.scheduler.error("Morning plan generation failed: \(String(describing: error), privacy: .public)")
        }
    }

    private func runMidday() async {
        let ctx = ModelContext(container)
        let tasks = todaysTasks(context: ctx)
        guard let message = Self.buildMiddayNudgeMessage(tasks: tasks) else { return }
        _ = await notifications.notify(context: ctx, message: message, subject: "Midday Nudge")
    }

    private func runEvening() async {
        let ctx = ModelContext(container)
        let tasks = todaysTasks(context: ctx)
        let settings = currentSettings(context: ctx)
        let appUrl = buildAppUrl(macLocalIp: settings.macLocalIp, appPort: settings.appPort)
        guard let message = Self.buildEveningWrapUpMessage(tasks: tasks, appUrl: appUrl) else { return }
        _ = await notifications.notify(context: ctx, message: message, subject: "Evening Wrap-up")
    }

    private func runWeeklyReflection() async {
        let ctx = ModelContext(container)
        do {
            let output = try await reflection.generate(context: ctx)
            let settings = currentSettings(context: ctx)
            let appUrl = buildAppUrl(macLocalIp: settings.macLocalIp, appPort: settings.appPort)
            let message = "Weekly reflection ready.\n\n\(output.summary)\n\nOpen: \(appUrl)/review"
            _ = await notifications.notify(context: ctx, message: message, subject: "Weekly Reflection")
        } catch {
            AppLog.scheduler.error("Weekly reflection failed: \(String(describing: error), privacy: .public)")
        }
    }

    // MARK: - Data helpers

    private func todaysTasks(context: ModelContext) -> [Task] {
        let start = Date().startOfDay()
        let descriptor = FetchDescriptor<DailyPlan>(
            predicate: #Predicate { $0.date == start }
        )
        guard let plan = try? context.fetch(descriptor).first else { return [] }
        return (plan.tasks ?? []).sorted { $0.order < $1.order }
    }

    private func currentSettings() -> AppSettings {
        currentSettings(context: ModelContext(container))
    }

    private func currentSettings(context: ModelContext) -> AppSettings {
        if let existing = try? context.fetch(FetchDescriptor<AppSettings>()).first {
            return existing
        }
        return AppSettings()
    }

    // MARK: - Static message builders (testable, mirror cron.ts)

    /// Mirrors `buildMiddayNudgeMessage` in `src/lib/cron.ts`.
    public static func buildMiddayNudgeMessage(tasks: [Task]) -> String? {
        let total = tasks.count
        guard total > 0 else { return nil }
        let completed = tasks.filter(\.completed).count
        let remaining = total - completed
        let percentage = (completed * 100) / total

        if percentage >= 50 || remaining == 0 { return nil }

        let remainingTasks = tasks.filter { !$0.completed }
        let focusTask =
            remainingTasks.first(where: { $0.urgency == .urgent })
            ?? remainingTasks.first(where: { $0.urgency == .high })

        if let focus = focusTask {
            return "You've got \(remaining) tasks left. The urgent one is \(focus.text)."
        }
        return "You've got \(remaining) tasks left."
    }

    /// Mirrors `buildEveningWrapUpMessage` in `src/lib/cron.ts`.
    public static func buildEveningWrapUpMessage(tasks: [Task], appUrl: String) -> String? {
        let remaining = tasks.filter { !$0.completed }
        guard !remaining.isEmpty else { return nil }
        let list = remaining.map(\.text).joined(separator: ", ")
        return "\(remaining.count) still open: \(list). Open the app to carry forward or drop: \(appUrl)"
    }

    // MARK: - Time math

    /// Next occurrence of `HH:mm` in `timezone`, computed from now. Skips to
    /// tomorrow if the time has already passed today.
    static func nextFireDate(forTimeOfDay hhmm: String, in timezone: TimeZone, now: Date = Date()) -> Date? {
        let parts = hhmm.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]),
              (0...23).contains(h), (0...59).contains(m) else { return nil }

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timezone

        var components = cal.dateComponents([.year, .month, .day], from: now)
        components.hour = h
        components.minute = m
        components.second = 0
        guard let candidate = cal.date(from: components) else { return nil }
        if candidate > now { return candidate }
        return cal.date(byAdding: .day, value: 1, to: candidate)
    }

    /// Next weekday/hour/minute in the future. `weekday` matches Calendar's
    /// 1=Sun..7=Sat convention.
    static func nextWeeklyFireDate(
        weekday: Int,
        hour: Int,
        minute: Int,
        in timezone: TimeZone,
        now: Date = Date()
    ) -> Date? {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timezone

        var components = DateComponents()
        components.weekday = weekday
        components.hour = hour
        components.minute = minute
        components.second = 0

        return cal.nextDate(after: now, matching: components, matchingPolicy: .nextTime)
    }

    // MARK: - Disable knob (parity with DISABLE_DAY_PLANNER_CRON env)

    private var isDisabled: Bool {
        ProcessInfo.processInfo.environment["DISABLE_DAY_PLANNER_CRON"] == "true"
    }
}
