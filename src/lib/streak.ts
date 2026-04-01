import { prisma } from "@/lib/prisma";

export async function calculateStreak(): Promise<number> {
  const plans = await prisma.dailyPlan.findMany({
    orderBy: { date: "desc" },
    include: { tasks: { select: { completed: true } } },
    take: 365,
  });

  let streak = 0;

  for (const plan of plans) {
    if (plan.tasks.length === 0) continue;
    const allDone = plan.tasks.every((t) => t.completed);
    if (allDone) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
