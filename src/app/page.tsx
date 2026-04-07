import Link from "next/link";
import { startOfDay } from "date-fns";
import { connection } from "next/server";
import FirstRunBanner from "@/components/FirstRunBanner";
import GenerateButton from "@/components/GenerateButton";
import QuoteBlock from "@/components/QuoteBlock";
import ScheduleBlock from "@/components/ScheduleBlock";
import StreakCounter from "@/components/StreakCounter";
import TodayPlanClient from "@/components/TodayPlanClient";
import WeatherBadge from "@/components/WeatherBadge";
import { getEventsForDate, needsContactSetup } from "@/lib/planner";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  await connection();

  const today = startOfDay(new Date());

  const [settings, plan, recurringEvents, activeGoalsCount] = await Promise.all([
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    }),
    prisma.dailyPlan.findUnique({
      where: { date: today },
      include: { tasks: { orderBy: { order: "asc" } } },
    }),
    prisma.recurringEvent.findMany({ where: { active: true } }),
    prisma.weeklyGoal.count({ where: { active: true } }),
  ]);

  const showFirstRun = needsContactSetup(settings);

  if (!plan) {
    return (
      <div className="space-y-6">
        <FirstRunBanner show={showFirstRun} />

        <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
            Today
          </p>
          <h1 className="mt-3 text-3xl text-gray-100">No plan generated yet.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
            Generate today&apos;s task list from your weekly goals, recurring
            schedule, weather snapshot, and carry-over work.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <GenerateButton />
            <Link
              href="/week"
              className="text-sm text-gray-400 transition-colors hover:text-gray-200"
            >
              {activeGoalsCount > 0
                ? `Review ${activeGoalsCount} active weekly goal${
                    activeGoalsCount === 1 ? "" : "s"
                  }`
                : "Set weekly goals first"}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const todaysEvents = getEventsForDate(recurringEvents, plan.date);

  return (
    <div className="space-y-6">
      <FirstRunBanner show={showFirstRun} />

      <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
              Today
            </p>
            <h1 className="mt-3 text-3xl text-gray-100">Daily Plan</h1>
          </div>

          <div className="flex flex-col items-start gap-2 text-left sm:items-end sm:text-right">
            <WeatherBadge weather={plan.weatherSummary} />
            <StreakCounter count={plan.streakCount} />
            <GenerateButton small label="regenerate plan" />
          </div>
        </div>

        <QuoteBlock quote={plan.quote} />
        <ScheduleBlock events={todaysEvents} />
        <TodayPlanClient initialTasks={plan.tasks} />
      </section>
    </div>
  );
}
