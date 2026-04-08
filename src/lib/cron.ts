import { startOfDay } from "date-fns";
import { generateDailyPlan } from "@/lib/generate-plan";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReflection } from "@/lib/reflection";
import { summarizeTasks } from "@/lib/planner";
import { getAppBaseUrl } from "@/lib/app-config";

interface TaskLike {
  text: string;
  completed: boolean;
  urgency?: string;
}

interface TodayPlanLike {
  tasks: TaskLike[];
}

interface CronDeps {
  generateDailyPlan: typeof generateDailyPlan;
  getTodayPlan: () => Promise<TodayPlanLike | null>;
  generateWeeklyReflection: typeof generateWeeklyReflection;
  notify: typeof notify;
}

const defaultDeps: CronDeps = {
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

export async function runMorningCron(deps: CronDeps = defaultDeps) {
  return deps.generateDailyPlan();
}

export async function runMiddayCron(deps: CronDeps = defaultDeps) {
  const plan = await deps.getTodayPlan();
  const message = buildMiddayNudgeMessage(plan?.tasks ?? []);

  if (!message) {
    return { notified: false, message: null };
  }

  const delivery = await deps.notify(message, "Midday Nudge");

  return {
    notified: Boolean(delivery.email || delivery.iMessage),
    message,
  };
}

export async function runEveningCron(
  deps: CronDeps = defaultDeps,
  appBaseUrl = getAppBaseUrl()
) {
  const plan = await deps.getTodayPlan();
  const message = buildEveningWrapUpMessage(plan?.tasks ?? [], appBaseUrl);

  if (!message) {
    return { notified: false, message: null };
  }

  const delivery = await deps.notify(message, "Evening Wrap-up");

  return {
    notified: Boolean(delivery.email || delivery.iMessage),
    message,
  };
}

export async function runWeeklyReviewCron(
  deps: CronDeps = defaultDeps,
  appBaseUrl = getAppBaseUrl()
) {
  const reflection = await deps.generateWeeklyReflection();
  const delivery = await deps.notify(
    `Weekly reflection ready.\n\n${reflection.summary}\n\nOpen: ${appBaseUrl}/review`,
    "Weekly Reflection"
  );

  return {
    notified: Boolean(delivery.email || delivery.iMessage),
    summary: reflection.summary,
  };
}
