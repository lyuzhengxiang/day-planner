import { isValid, parseISO, startOfDay } from "date-fns";

export interface TaskLike {
  completed: boolean;
}

export interface SettingsLike {
  iMessagePhone: string;
  emailAddress: string;
}

export interface RecurringEventLike {
  title: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
}

export function summarizeTasks<T extends TaskLike>(tasks: T[]) {
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    percentage,
    remaining: total - completed,
  };
}

export function needsContactSetup(settings?: SettingsLike | null): boolean {
  return !settings?.iMessagePhone.trim() && !settings?.emailAddress.trim();
}

export function getEventsForDate<T extends RecurringEventLike>(
  events: T[],
  date: Date
): T[] {
  const dayOfWeek = date.getDay();

  return events
    .filter((event) =>
      event.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
    )
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
}

export function parseDayParam(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = startOfDay(parseISO(value));
  return isValid(parsed) ? parsed : null;
}

export function getPortFromHost(host: string | null): string {
  if (!host) {
    return "3000";
  }

  const match = /:(\d+)$/.exec(host.trim());
  return match?.[1] ?? "3000";
}

export function buildAppUrl(macLocalIp: string, appPort: string): string {
  return `http://${macLocalIp || "localhost"}:${appPort || "3000"}`;
}
