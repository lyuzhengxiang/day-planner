import { NextResponse } from "next/server";
import { calculateStreak } from "@/lib/streak";

export async function GET() {
  const streak = await calculateStreak();
  return NextResponse.json({ streak });
}
