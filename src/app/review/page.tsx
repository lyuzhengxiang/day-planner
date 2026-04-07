import Link from "next/link";
import { startOfWeek } from "date-fns";
import { connection } from "next/server";
import GenerateReflectionButton from "@/components/GenerateReflectionButton";
import ReflectionCard from "@/components/ReflectionCard";
import { prisma } from "@/lib/prisma";

export default async function ReviewPage() {
  await connection();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const reflection = await prisma.weeklyReflection.findUnique({
    where: { weekStart },
  });

  const goalsBreakdown = reflection
    ? (JSON.parse(reflection.goalsBreakdown) as {
        goalId: number;
        goalText: string;
        tasksCompleted: number;
        tasksTotal: number;
      }[])
    : [];
  const carryForward = reflection
    ? (JSON.parse(reflection.carryForward) as string[])
    : [];

  return (
    <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
      <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
        Weekly Review
      </p>
      <h1 className="mt-3 text-3xl text-gray-100">Reflection</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
        Capture the current week before you reset the goal list. This turns the
        raw task history into a short scorecard plus a carry-forward list.
      </p>

      <div className="mt-8">
        {reflection ? (
          <ReflectionCard
            tasksCompleted={reflection.tasksCompleted}
            tasksTotal={reflection.tasksTotal}
            goalsBreakdown={goalsBreakdown}
            carryForward={carryForward}
            summary={reflection.summary}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-800 px-5 py-6">
            <p className="text-sm text-gray-400">
              No reflection has been generated for this week yet.
            </p>
            <div className="mt-4">
              <GenerateReflectionButton />
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/week"
          className="text-sm text-green-500 transition-colors hover:text-green-400"
        >
          Set next week&apos;s goals →
        </Link>
      </div>
    </section>
  );
}
