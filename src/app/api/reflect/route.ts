import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week");
  const weekStart = weekParam
    ? new Date(weekParam)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const reflection = await prisma.weeklyReflection.findUnique({
    where: { weekStart },
  });

  if (!reflection) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    ...reflection,
    goalsBreakdown: JSON.parse(reflection.goalsBreakdown),
    carryForward: JSON.parse(reflection.carryForward),
  });
}

export async function POST() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const plans = await prisma.dailyPlan.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    include: { tasks: true },
  });

  const allTasks = plans.flatMap((p) => p.tasks);
  const tasksCompleted = allTasks.filter((t) => t.completed).length;
  const tasksTotal = allTasks.length;

  const goals = await prisma.weeklyGoal.findMany({
    where: { weekStart, active: true },
    include: { tasks: true },
  });

  const goalsBreakdown = goals.map((g) => ({
    goalId: g.id,
    goalText: g.text,
    tasksCompleted: g.tasks.filter((t) => t.completed).length,
    tasksTotal: g.tasks.length,
  }));

  const incompleteTasks = allTasks
    .filter((t) => !t.completed)
    .map((t) => t.text);

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

  return NextResponse.json({
    ...reflection,
    goalsBreakdown,
    carryForward: incompleteTasks,
  });
}
