import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { tasks } = await req.json();

  await Promise.all(
    tasks.map((t: { id: number; order: number }) =>
      prisma.task.update({ where: { id: t.id }, data: { order: t.order } })
    )
  );

  return NextResponse.json({ reordered: true });
}
