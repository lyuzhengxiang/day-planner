import Link from "next/link";
import { format } from "date-fns";
import { connection } from "next/server";
import { summarizeTasks } from "@/lib/planner";
import { prisma } from "@/lib/prisma";

export default async function HistoryPage() {
  await connection();

  const plans = await prisma.dailyPlan.findMany({
    include: {
      tasks: {
        select: { completed: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return (
    <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
      <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
        History
      </p>
      <h1 className="mt-3 text-3xl text-gray-100">Past days</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
        Browse previous plans to see completion rate, streak context, and the
        exact task list that was generated on a given date.
      </p>

      <div className="mt-8 space-y-3">
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500">No saved days yet.</p>
        ) : (
          plans.map((plan) => {
            const summary = summarizeTasks(plan.tasks);
            const slug = format(plan.date, "yyyy-MM-dd");

            return (
              <Link
                key={plan.id}
                href={`/history/${slug}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-800/80 px-4 py-4 transition-colors hover:border-gray-700 hover:bg-white/[0.02]"
              >
                <div>
                  <p className="text-sm text-gray-200">
                    {format(plan.date, "EEEE, MMMM d")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{plan.weatherSummary}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-300">
                    {summary.completed}/{summary.total}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {summary.percentage}% complete
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
