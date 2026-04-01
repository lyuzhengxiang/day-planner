import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";

export async function GET() {
  const weather = await fetchWeather();
  return NextResponse.json({ weather });
}
