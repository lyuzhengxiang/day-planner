import type { Task } from "@prisma/client";

export interface ThreeRingValues {
  done: number;
  focus: number;
  energy: number;
  donePercent: number;
  doneCount: number;
  totalCount: number;
  focusDone: number;
  focusTotal: number;
  energyDone: number;
  energyTotal: number;
}

const FOCUS_LEVELS = new Set(["URGENT", "HIGH"]);

export function computeThreeRings(tasks: Pick<Task, "completed" | "urgency">[]): ThreeRingValues {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const donePercent = total > 0 ? Math.round((done / total) * 100) : 0;

  const focusTasks = tasks.filter((t) => FOCUS_LEVELS.has(t.urgency));
  const focusDoneCount = focusTasks.filter((t) => t.completed).length;
  const focus = focusTasks.length > 0 ? focusDoneCount / focusTasks.length : 0;

  const energyTasks = tasks.filter((t) => !FOCUS_LEVELS.has(t.urgency));
  const energyDoneCount = energyTasks.filter((t) => t.completed).length;
  const energy = energyTasks.length > 0 ? energyDoneCount / energyTasks.length : 0;

  return {
    done: total > 0 ? done / total : 0,
    focus,
    energy,
    donePercent,
    doneCount: done,
    totalCount: total,
    focusDone: focusDoneCount,
    focusTotal: focusTasks.length,
    energyDone: energyDoneCount,
    energyTotal: energyTasks.length,
  };
}

export function pickNextTask<T extends { completed: boolean; urgency: string }>(
  tasks: T[]
): T | undefined {
  const order: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const open = tasks.filter((t) => !t.completed);
  open.sort((a, b) => (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4));
  return open[0];
}
