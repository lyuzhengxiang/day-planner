import { NextRequest, NextResponse } from "next/server";
import {
  runEveningCron,
  runMiddayCron,
  runMorningCron,
  runWeeklyReviewCron,
} from "@/lib/cron";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";

const handlers = {
  morning: runMorningCron,
  midday: runMiddayCron,
  evening: runEveningCron,
  "weekly-review": runWeeklyReviewCron,
} as const;

async function handleCron(
  request: NextRequest,
  context: RouteContext<"/api/cron/[job]">
) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job } = await context.params;
  const handler = handlers[job as keyof typeof handlers];

  if (!handler) {
    return NextResponse.json({ error: "Unknown cron job" }, { status: 404 });
  }

  try {
    const result = await handler();
    return NextResponse.json({ ok: true, job, result });
  } catch (error) {
    console.error(`[cron:${job}] failed`, error);
    return NextResponse.json(
      { error: "Cron job failed", job },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/cron/[job]">
) {
  return handleCron(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/cron/[job]">
) {
  return handleCron(request, context);
}
