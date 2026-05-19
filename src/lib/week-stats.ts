import { addDays, startOfDay, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";

export interface DayStat {
  date: Date;
  dayLabel: string;
  dayShort: string;
  dayNumber: number;
  total: number;
  completed: number;
  ratio: number;
  hasData: boolean;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function getWeekStats(reference: Date = new Date()): Promise<{
  weekStart: Date;
  todayIndex: number;
  days: DayStat[];
}> {
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
  const today = startOfDay(reference);
  const todayIndex = Math.max(
    0,
    Math.min(6, Math.round((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)))
  );

  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const plans = await prisma.dailyPlan.findMany({
    where: { date: { gte: weekStart, lte: addDays(weekStart, 6) } },
    include: { tasks: { select: { completed: true } } },
  });

  const days: DayStat[] = dates.map((date, i) => {
    const plan = plans.find((p) => startOfDay(p.date).getTime() === startOfDay(date).getTime());
    const total = plan?.tasks.length ?? 0;
    const completed = plan?.tasks.filter((t) => t.completed).length ?? 0;
    const ratio = total > 0 ? completed / total : 0;
    return {
      date,
      dayLabel: DAY_NAMES[i],
      dayShort: DAY_NAMES[i],
      dayNumber: date.getDate(),
      total,
      completed,
      ratio,
      hasData: !!plan,
    };
  });

  return { weekStart, todayIndex, days };
}
