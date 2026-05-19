import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";
import { fetchWeather } from "@/lib/weather";
import { pickQuote } from "@/lib/quotes";
import { calculateStreak } from "@/lib/streak";
import { exportDayMarkdown } from "@/lib/markdown";
import { notify } from "@/lib/notifications";
import { startOfDay } from "date-fns";
import { buildAppUrl, getEventsForDate } from "@/lib/planner";
import {
  PROMPT_LIMITS,
  PROMPT_SAFETY_PREAMBLE,
  sanitizeUserText,
  wrapUserBlock,
} from "@/lib/prompt-safety";
import { logger } from "@/lib/logger";

const log = logger("generate-plan");

export async function generateDailyPlan() {
  const today = startOfDay(new Date());
  const openai = getOpenAI();

  const [
    weather,
    quote,
    streak,
    weeklyGoals,
    recurringEvents,
    rolledTasks,
    settings,
  ] =
    await Promise.all([
      fetchWeather(),
      pickQuote(),
      calculateStreak(),
      prisma.weeklyGoal.findMany({ where: { active: true } }),
      prisma.recurringEvent.findMany({ where: { active: true } }),
      prisma.task.findMany({
        where: {
          completed: false,
          dailyPlan: { date: { lt: today } },
        },
        orderBy: { rolledDays: "desc" },
      }),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);

  const todaysEvents = getEventsForDate(recurringEvents, today);

  // SECURITY: every user-controlled field is sanitized before being
  // concatenated into the prompt, and the resulting content is wrapped in
  // delimited blocks. See src/lib/prompt-safety.ts.
  const goalsLines = weeklyGoals.map(
    (g) => `- [${g.priority}] ${sanitizeUserText(g.text)} (id: ${g.id})`
  );
  const goalsBlock = wrapUserBlock(
    "weekly-goals",
    goalsLines.length > 0 ? goalsLines.join("\n") : "No weekly goals set"
  );

  const rolledLines = rolledTasks.map(
    (t) =>
      `- "${sanitizeUserText(t.text)}" (urgency: ${t.urgency}, rolled ${t.rolledDays} days)`
  );
  const rolledBlock = wrapUserBlock(
    "rolled-tasks",
    rolledLines.length > 0 ? rolledLines.join("\n") : "None"
  );

  const scheduleLines = todaysEvents.map(
    (e) =>
      `- ${e.startTime}-${e.endTime}: ${sanitizeUserText(e.title, PROMPT_LIMITS.title)}`
  );
  const scheduleBlock = wrapUserBlock(
    "schedule",
    scheduleLines.length > 0 ? scheduleLines.join("\n") : "No recurring events today"
  );

  const systemPrompt = `You are a proactive daily planner. ${PROMPT_SAFETY_PREAMBLE}

Rules:
- Generate 3-7 tasks total (including carried-over tasks).
- Carried-over tasks should be included with bumped urgency.
- If a task has rolled 3+ days, flag it explicitly.
- Assign urgency: URGENT, HIGH, MEDIUM, or LOW.
- Each task should link to a weeklyGoalId if applicable (null if ad-hoc).
- Schedule tasks around fixed events.
- Be specific and actionable.

Respond with ONLY valid JSON:
{
  "tasks": [
    { "text": "task description", "urgency": "URGENT|HIGH|MEDIUM|LOW", "weeklyGoalId": number|null }
  ]
}`;

  const userPrompt = [goalsBlock, rolledBlock, scheduleBlock].join("\n\n");

  // Retry with exponential backoff (up to 3 attempts)
  let completion;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      break;
    } catch (err) {
      log.warn("openai chat.completions failed", { attempt, error: String(err) });
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  const generated = JSON.parse(
    completion!.choices[0].message.content || '{"tasks":[]}'
  );

  // Delete existing plan for today if regenerating
  const existingPlan = await prisma.dailyPlan.findUnique({
    where: { date: today },
  });
  if (existingPlan) {
    await prisma.dailyPlan.delete({ where: { id: existingPlan.id } });
  }

  const plan = await prisma.dailyPlan.create({
    data: {
      date: today,
      quote,
      weatherSummary: weather,
      markdownPath: "",
      streakCount: streak,
    },
  });

  const tasks = generated.tasks.map(
    (
      t: { text: string; urgency: string; weeklyGoalId: number | null },
      i: number
    ) => {
      const rolledTask = rolledTasks.find((rt) => rt.text === t.text);
      return {
        dailyPlanId: plan.id,
        text: t.text,
        urgency: t.urgency,
        weeklyGoalId: t.weeklyGoalId,
        completed: false,
        rolledOver: !!rolledTask,
        rolledDays: rolledTask ? rolledTask.rolledDays + 1 : 0,
        order: i,
      };
    }
  );

  await prisma.task.createMany({ data: tasks });

  const schedule = todaysEvents.map((e) => ({
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
  }));

  const mdPath = exportDayMarkdown({
    date: today,
    weather,
    quote,
    schedule,
    tasks: tasks.map(
      (t: {
        text: string;
        urgency: string;
        completed: boolean;
        rolledOver: boolean;
      }) => ({
        text: t.text,
        urgency: t.urgency,
        completed: t.completed,
        rolledOver: t.rolledOver,
      })
    ),
  });

  await prisma.dailyPlan.update({
    where: { id: plan.id },
    data: { markdownPath: mdPath },
  });

  const taskSummary = tasks
    .map(
      (t: { text: string; urgency: string }) => `\u2022 [${t.urgency}] ${t.text}`
    )
    .join("\n");

  const appUrl = buildAppUrl(settings?.macLocalIp ?? "", settings?.appPort ?? "3000");
  const message = `Good morning! Here's your plan for today:\n\n"${quote}"\n\n${taskSummary}\n\nWeather: Chicago ${weather}\nStreak: ${streak} days\n\nOpen: ${appUrl}`;

  await notify(message, "Your Day Plan");

  return {
    planId: plan.id,
    quote,
    weather,
    streak,
    tasks: generated.tasks,
  };
}
