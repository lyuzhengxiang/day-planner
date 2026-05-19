import { endOfWeek, startOfWeek } from "date-fns";
import { getOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import {
  PROMPT_LIMITS,
  PROMPT_SAFETY_PREAMBLE,
  sanitizeUserText,
  wrapUserBlock,
} from "@/lib/prompt-safety";

export async function generateWeeklyReflection() {
  const openai = getOpenAI();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const plans = await prisma.dailyPlan.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    include: { tasks: true },
  });

  const allTasks = plans.flatMap((plan) => plan.tasks);
  const tasksCompleted = allTasks.filter((task) => task.completed).length;
  const tasksTotal = allTasks.length;

  const goals = await prisma.weeklyGoal.findMany({
    where: { weekStart, active: true },
    include: { tasks: true },
  });

  const goalsBreakdown = goals.map((goal) => ({
    goalId: goal.id,
    goalText: goal.text,
    tasksCompleted: goal.tasks.filter((task) => task.completed).length,
    tasksTotal: goal.tasks.length,
  }));

  const incompleteTasks = allTasks
    .filter((task) => !task.completed)
    .map((task) => task.text);

  // SECURITY: user-controlled text (goalText, task.text) is sanitized and
  // wrapped before going into the prompt. See src/lib/prompt-safety.ts.
  const safeBreakdown = goalsBreakdown.map((entry) => ({
    goalId: entry.goalId,
    goalText: sanitizeUserText(entry.goalText),
    tasksCompleted: entry.tasksCompleted,
    tasksTotal: entry.tasksTotal,
  }));
  const safeIncomplete = incompleteTasks
    .map((text) => sanitizeUserText(text))
    .filter((text) => text.length > 0);

  const userBlock = wrapUserBlock(
    "weekly-stats",
    [
      `Completed ${tasksCompleted}/${tasksTotal} tasks.`,
      `Goals: ${JSON.stringify(safeBreakdown).slice(0, PROMPT_LIMITS.totalUserBlock)}`,
      `Incomplete: ${safeIncomplete.length > 0 ? safeIncomplete.join(", ") : "None"}`,
    ].join("\n")
  );

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "system",
        content:
          "Write a brief, encouraging weekly reflection (2-3 sentences). Be honest about what didn't get done but focus on progress. " +
          PROMPT_SAFETY_PREAMBLE,
      },
      { role: "user", content: userBlock },
    ],
  });

  const summary = completion.choices[0].message.content || "";

  const reflection = await prisma.weeklyReflection.upsert({
    where: { weekStart },
    update: {
      tasksCompleted,
      tasksTotal,
      goalsBreakdown: JSON.stringify(goalsBreakdown),
      carryForward: JSON.stringify(incompleteTasks),
      summary,
    },
    create: {
      weekStart,
      tasksCompleted,
      tasksTotal,
      goalsBreakdown: JSON.stringify(goalsBreakdown),
      carryForward: JSON.stringify(incompleteTasks),
      summary,
    },
  });

  return {
    ...reflection,
    goalsBreakdown,
    carryForward: incompleteTasks,
  };
}
