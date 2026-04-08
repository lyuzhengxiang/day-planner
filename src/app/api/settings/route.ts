import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1 } });
  }

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const data = await req.json();

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...(data.emailAddress !== undefined && {
        emailAddress: data.emailAddress,
      }),
      ...(data.morningTime !== undefined && { morningTime: data.morningTime }),
      ...(data.middayTime !== undefined && { middayTime: data.middayTime }),
      ...(data.eveningTime !== undefined && { eveningTime: data.eveningTime }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
    update: {
      ...(data.emailAddress !== undefined && {
        emailAddress: data.emailAddress,
      }),
      ...(data.morningTime !== undefined && { morningTime: data.morningTime }),
      ...(data.middayTime !== undefined && { middayTime: data.middayTime }),
      ...(data.eveningTime !== undefined && { eveningTime: data.eveningTime }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
  });

  return NextResponse.json(settings);
}
