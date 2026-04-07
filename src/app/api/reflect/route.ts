import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "date-fns";
import { generateWeeklyReflection } from "@/lib/reflection";

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
  return NextResponse.json(await generateWeeklyReflection());
}
