import { NextResponse } from "next/server";
import { generateDailyPlan } from "@/lib/generate-plan";

export async function POST() {
  try {
    const result = await generateDailyPlan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Plan generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
