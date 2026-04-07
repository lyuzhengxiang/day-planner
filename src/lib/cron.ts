import cron from "node-cron";
import { startOfDay } from "date-fns";
import { generateDailyPlan } from "@/lib/generate-plan";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReflection } from "@/lib/reflection";
import { buildAppUrl, summarizeTasks } from "@/lib/planner";

interface CronSettings {
  morningTime: string;
  middayTime: string;
  eveningTime: string;
  timezone: string;
  macLocalIp: string;
  appPort: string;
}

interface TaskLike {
  text: string;
  completed: boolean;
  urgency?: string;
}

interface TodayPlanLike {
  tasks: TaskLike[];
}

interface ScheduledJob {
  stop: () => void;
  destroy?: () => void;
}

interface Scheduler {
  schedule: (
    expression: string,
    task: () => void | Promise<void>,
    options?: { timezone?: string }
  ) => ScheduledJob;
}

interface CronDeps {
  getSettings: () => Promise<Partial<CronSettings> | null>;
  generateDailyPlan: typeof generateDailyPlan;
  getTodayPlan: () => Promise<TodayPlanLike | null>;
  generateWeeklyReflection: typeof generateWeeklyReflection;
  notify: typeof notify;
}

interface CronState {
  jobs: ScheduledJob[];
}

const globalForCron = globalThis as unknown as { dayPlannerCron?: CronState };

const defaultSettings: CronSettings = {
  morningTime: "06:30",
  middayTime: "12:30",
  eveningTime: "20:30",
  timezone: "America/Chicago",
  macLocalIp: "",
  appPort: "3000",
};

const defaultDeps: CronDeps = {
  async getSettings() {
    return prisma.settings.findUnique({ where: { id: 1 } });
  },
  generateDailyPlan,
  async getTodayPlan() {
    return prisma.dailyPlan.findUnique({
      where: { date: startOfDay(new Date()) },
      include: {
        tasks: {
          orderBy: { order: "asc" },
        },
      },
    });
  },
  generateWeeklyReflection,
  notify,
};

export function timeToCron(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const [, hours, minutes] = match;
  return `${Number(minutes)} ${Number(hours)} * * *`;
}

export function buildMiddayNudgeMessage(tasks: TaskLike[]): string | null {
  const summary = summarizeTasks(tasks);

  if (summary.total === 0 || summary.percentage >= 50 || summary.remaining === 0) {
    return null;
  }

  const remainingTasks = tasks.filter((task) => !task.completed);
  const focusTask =
    remainingTasks.find((task) => task.urgency === "URGENT") ??
    remainingTasks.find((task) => task.urgency === "HIGH");

  return `You've got ${summary.remaining} tasks left.${focusTask ? ` The urgent one is ${focusTask.text}.` : ""}`;
}

export function buildEveningWrapUpMessage(
  tasks: TaskLike[],
  appUrl: string
): string | null {
  const remainingTasks = tasks.filter((task) => !task.completed);

  if (remainingTasks.length === 0) {
    return null;
  }

  return `${remainingTasks.length} still open: ${remainingTasks
    .map((task) => task.text)
    .join(", ")}. Open the app to carry forward or drop: ${appUrl}`;
}

function shouldSkipCronInitialization(): boolean {
  return (
    process.env.DISABLE_DAY_PLANNER_CRON === "true" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function stopJobs(jobs: ScheduledJob[]) {
  for (const job of jobs) {
    job.stop();
    job.destroy?.();
  }
}

async function createCronState(
  scheduler: Scheduler,
  deps: CronDeps
): Promise<CronState> {
  const settings = {
    ...defaultSettings,
    ...(await deps.getSettings()),
  };

  const jobs = [
    scheduler.schedule(
      timeToCron(settings.morningTime),
      async () => {
        try {
          await deps.generateDailyPlan();
        } catch (error) {
          console.error("[cron] Daily plan generation failed:", error);
        }
      },
      { timezone: settings.timezone }
    ),
    scheduler.schedule(
      timeToCron(settings.middayTime),
      async () => {
        try {
          const plan = await deps.getTodayPlan();
          const message = buildMiddayNudgeMessage(plan?.tasks ?? []);

          if (message) {
            await deps.notify(message, "Midday Nudge");
          }
        } catch (error) {
          console.error("[cron] Midday nudge failed:", error);
        }
      },
      { timezone: settings.timezone }
    ),
    scheduler.schedule(
      timeToCron(settings.eveningTime),
      async () => {
        try {
          const plan = await deps.getTodayPlan();
          const message = buildEveningWrapUpMessage(
            plan?.tasks ?? [],
            buildAppUrl(settings.macLocalIp, settings.appPort)
          );

          if (message) {
            await deps.notify(message, "Evening Wrap-up");
          }
        } catch (error) {
          console.error("[cron] Evening wrap-up failed:", error);
        }
      },
      { timezone: settings.timezone }
    ),
    scheduler.schedule(
      "0 18 * * 0",
      async () => {
        try {
          const reflection = await deps.generateWeeklyReflection();
          await deps.notify(
            `Weekly reflection ready.\n\n${reflection.summary}\n\nOpen: ${buildAppUrl(settings.macLocalIp, settings.appPort)}/review`,
            "Weekly Reflection"
          );
        } catch (error) {
          console.error("[cron] Weekly reflection failed:", error);
        }
      },
      { timezone: settings.timezone }
    ),
  ];

  return { jobs };
}

export async function initCron(options?: {
  scheduler?: Scheduler;
  deps?: CronDeps;
}) {
  if (shouldSkipCronInitialization()) {
    return;
  }

  if (globalForCron.dayPlannerCron) {
    return;
  }

  const scheduler = options?.scheduler ?? cron;
  const deps = options?.deps ?? defaultDeps;

  globalForCron.dayPlannerCron = await createCronState(scheduler, deps);
}

export async function reloadCron(options?: {
  scheduler?: Scheduler;
  deps?: CronDeps;
}) {
  if (shouldSkipCronInitialization()) {
    return;
  }

  if (globalForCron.dayPlannerCron) {
    stopJobs(globalForCron.dayPlannerCron.jobs);
  }

  const scheduler = options?.scheduler ?? cron;
  const deps = options?.deps ?? defaultDeps;

  globalForCron.dayPlannerCron = await createCronState(scheduler, deps);
}

export function resetCronForTests() {
  if (globalForCron.dayPlannerCron) {
    stopJobs(globalForCron.dayPlannerCron.jobs);
    delete globalForCron.dayPlannerCron;
  }
}
