import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const { text, urgency = "MEDIUM" } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const plan = await prisma.dailyPlan.findUnique({ where: { date: today } });

  if (!plan) {
    return NextResponse.json(
      { error: "No plan for today. Generate one first." },
      { status: 404 }
    );
  }

  const maxOrder = await prisma.task.aggregate({
    where: { dailyPlanId: plan.id },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      dailyPlanId: plan.id,
      text,
      urgency,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
