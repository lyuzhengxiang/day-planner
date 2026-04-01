import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.recurringEvent.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const { title, daysOfWeek, startTime, endTime } = await req.json();

  if (!title || !daysOfWeek || !startTime || !endTime) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const event = await prisma.recurringEvent.create({
    data: { title, daysOfWeek, startTime, endTime },
  });

  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();

  const event = await prisma.recurringEvent.update({
    where: { id },
    data,
  });

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  await prisma.recurringEvent.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
