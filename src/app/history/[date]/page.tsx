import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ProgressBar from "@/components/ProgressBar";
import QuoteBlock from "@/components/QuoteBlock";
import ScheduleBlock from "@/components/ScheduleBlock";
import StreakCounter from "@/components/StreakCounter";
import TaskList from "@/components/TaskList";
import WeatherBadge from "@/components/WeatherBadge";
import { getEventsForDate, parseDayParam, summarizeTasks } from "@/lib/planner";
import { prisma } from "@/lib/prisma";

interface HistoryDayPageProps {
  params: Promise<{ date: string }>;
}

export default async function HistoryDayPage({
  params,
}: HistoryDayPageProps) {
  await connection();

  const { date } = await params;
  const parsedDate = parseDayParam(date);

  if (!parsedDate) {
    notFound();
  }

  const [plan, recurringEvents] = await Promise.all([
    prisma.dailyPlan.findUnique({
      where: { date: parsedDate },
      include: { tasks: { orderBy: { order: "asc" } } },
    }),
    prisma.recurringEvent.findMany({ where: { active: true } }),
  ]);

  if (!plan) {
    notFound();
  }

  const summary = summarizeTasks(plan.tasks);
  const events = getEventsForDate(recurringEvents, plan.date);

  return (
    <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
            History Detail
          </p>
          <h1 className="mt-3 text-3xl text-gray-100">
            {format(plan.date, "EEEE, MMMM d")}
          </h1>
        </div>

        <div className="flex flex-col items-start gap-2 text-left sm:items-end sm:text-right">
          <WeatherBadge weather={plan.weatherSummary} />
          <StreakCounter count={plan.streakCount} />
        </div>
      </div>

      <QuoteBlock quote={plan.quote} />
      <ScheduleBlock events={events} />

      <section className="rounded-2xl border border-gray-800/80 bg-black/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
              Archived Tasks
            </p>
            <p className="mt-2 text-sm text-gray-400">
              {summary.completed === summary.total
                ? "That day was fully completed."
                : `${summary.remaining} unfinished on this date.`}
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {summary.percentage}% done
          </span>
        </div>

        <ProgressBar completed={summary.completed} total={summary.total} />

        <div className="mt-4">
          <TaskList initialTasks={plan.tasks} readOnly />
        </div>
      </section>

      <div className="mt-8">
        <Link
          href="/history"
          className="text-sm text-green-500 transition-colors hover:text-green-400"
        >
          ← Back to history
        </Link>
      </div>
    </section>
  );
}
