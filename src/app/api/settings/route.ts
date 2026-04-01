import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { networkInterfaces } from "os";

function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1 } });
  }

  const localIp = getLocalIp();
  if (settings.macLocalIp !== localIp) {
    settings = await prisma.settings.update({
      where: { id: 1 },
      data: { macLocalIp: localIp },
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const data = await req.json();

  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...(data.iMessagePhone !== undefined && {
        iMessagePhone: data.iMessagePhone,
      }),
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
