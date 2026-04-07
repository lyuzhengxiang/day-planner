import { endOfWeek, startOfWeek } from "date-fns";
import { getOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

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

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "system",
        content:
          "Write a brief, encouraging weekly reflection (2-3 sentences). Be honest about what didn't get done but focus on progress.",
      },
      {
        role: "user",
        content: `Completed ${tasksCompleted}/${tasksTotal} tasks. Goals: ${JSON.stringify(goalsBreakdown)}. Incomplete: ${incompleteTasks.join(", ") || "None"}`,
      },
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
