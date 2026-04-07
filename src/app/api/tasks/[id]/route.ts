import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportDayMarkdown } from "@/lib/markdown";
import { getEventsForDate } from "@/lib/planner";

async function reExportMarkdown(dailyPlanId: number) {
  const plan = await prisma.dailyPlan.findUnique({
    where: { id: dailyPlanId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  if (!plan) return;

  const events = await prisma.recurringEvent.findMany({
    where: { active: true },
  });
  const todaysEvents = getEventsForDate(events, plan.date);

  exportDayMarkdown({
    date: plan.date,
    weather: plan.weatherSummary,
    quote: plan.quote,
    schedule: todaysEvents.map((e) => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
    tasks: plan.tasks.map((t) => ({
      text: t.text,
      urgency: t.urgency,
      completed: t.completed,
      rolledOver: t.rolledOver,
    })),
  });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id: Number(id) },
    data: { completed: !task.completed },
  });

  await reExportMarkdown(task.dailyPlanId);

  return NextResponse.json(updated);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { text, urgency } = await req.json();

  const updated = await prisma.task.update({
    where: { id: Number(id) },
    data: {
      ...(text !== undefined && { text }),
      ...(urgency !== undefined && { urgency }),
    },
  });

  await reExportMarkdown(updated.dailyPlanId);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id: Number(id) } });
  await reExportMarkdown(task.dailyPlanId);

  return NextResponse.json({ deleted: true });
}
