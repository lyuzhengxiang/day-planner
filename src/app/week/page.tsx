import { startOfWeek } from "date-fns";
import { connection } from "next/server";
import GoalSetupPanel from "@/components/GoalSetupPanel";
import { prisma } from "@/lib/prisma";

const priorityOrder = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

export default async function WeekPage() {
  await connection();

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [goals, previousReflection] = await Promise.all([
    prisma.weeklyGoal.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.weeklyReflection.findFirst({
      where: { weekStart: { lt: currentWeekStart } },
      orderBy: { weekStart: "desc" },
    }),
  ]);

  const carryForward = previousReflection
    ? (JSON.parse(previousReflection.carryForward) as string[])
    : [];

  const sortedGoals = [...goals].sort(
    (left, right) =>
      priorityOrder[left.priority as keyof typeof priorityOrder] -
      priorityOrder[right.priority as keyof typeof priorityOrder]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
          This Week
        </p>
        <h1 className="mt-3 text-3xl text-gray-100">Weekly Goals</h1>
        <p className="mt-3 text-sm leading-7 text-gray-400">
          Keep the active goals list lean. The daily plan generator will use
          this list as the default source of truth each morning.
        </p>

        <div className="mt-6 space-y-3">
          {sortedGoals.length === 0 ? (
            <p className="text-sm text-gray-500">No active goals yet.</p>
          ) : (
            sortedGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-gray-800/80 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-200">{goal.text}</span>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-gray-500">
                    {goal.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {carryForward.length > 0 && (
          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
              Carry Forward
            </p>
            <div className="mt-3 space-y-2">
              {carryForward.map((task, index) => (
                <p key={`${task}-${index}`} className="text-sm text-gray-500">
                  • {task}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
          Goal Setup
        </p>
        <h2 className="mt-3 text-2xl text-gray-100">Generate a fresh weekly focus.</h2>
        <p className="mt-3 text-sm leading-7 text-gray-400">
          The guided flow asks a few narrowing questions and then proposes a
          compact goal set you can accept or reshuffle.
        </p>

        <GoalSetupPanel />
      </section>
    </div>
  );
}
