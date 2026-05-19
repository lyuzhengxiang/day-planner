import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export interface HeatmapDay {
  date: Date;
  total: number;
  completed: number;
  ratio: number;
  isToday: boolean;
  hasData: boolean;
}

export interface RecentDay {
  id: number;
  date: Date;
  total: number;
  completed: number;
  ratio: number;
  weatherSummary: string;
  isToday: boolean;
}

export interface HistoryStats {
  rangeStart: Date;
  rangeEnd: Date;
  heatmap: HeatmapDay[];
  recent: RecentDay[];
  totalDone: number;
  totalTasks: number;
  avg: number;
  perfectDays: number;
}

export async function getHistoryStats(
  reference: Date = new Date(),
  rangeDays = 28
): Promise<HistoryStats> {
  const today = startOfDay(reference);
  const rangeStart = addDays(today, -(rangeDays - 1));

  const plans = await prisma.dailyPlan.findMany({
    where: { date: { gte: rangeStart, lte: today } },
    include: { tasks: { select: { completed: true } } },
    orderBy: { date: "asc" },
  });

  const map = new Map<number, (typeof plans)[number]>();
  for (const plan of plans) {
    map.set(startOfDay(plan.date).getTime(), plan);
  }

  const heatmap: HeatmapDay[] = Array.from({ length: rangeDays }, (_, i) => {
    const date = addDays(rangeStart, i);
    const key = startOfDay(date).getTime();
    const plan = map.get(key);
    const total = plan?.tasks.length ?? 0;
    const completed = plan?.tasks.filter((t) => t.completed).length ?? 0;
    return {
      date,
      total,
      completed,
      ratio: total > 0 ? completed / total : 0,
      isToday: i === rangeDays - 1,
      hasData: !!plan,
    };
  });

  const recent: RecentDay[] = [...plans]
    .reverse()
    .slice(0, 8)
    .map((plan) => {
      const total = plan.tasks.length;
      const completed = plan.tasks.filter((t) => t.completed).length;
      return {
        id: plan.id,
        date: plan.date,
        total,
        completed,
        ratio: total > 0 ? completed / total : 0,
        weatherSummary: plan.weatherSummary,
        isToday: startOfDay(plan.date).getTime() === today.getTime(),
      };
    });

  const totalDone = heatmap.reduce((s, d) => s + d.completed, 0);
  const totalTasks = heatmap.reduce((s, d) => s + d.total, 0);
  const avg = totalTasks > 0 ? totalDone / totalTasks : 0;
  const perfectDays = heatmap.filter((d) => d.hasData && d.ratio === 1).length;

  return { rangeStart, rangeEnd: today, heatmap, recent, totalDone, totalTasks, avg, perfectDays };
}
