"use client";

import { useState } from "react";
import ProgressBar from "./ProgressBar";
import TaskList from "./TaskList";
import { summarizeTasks } from "@/lib/planner";

interface Task {
  id: number;
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
  rolledDays: number;
}

interface TodayPlanClientProps {
  initialTasks: Task[];
}

export default function TodayPlanClient({
  initialTasks,
}: TodayPlanClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const summary = summarizeTasks(tasks);

  return (
    <section className="rounded-2xl border border-gray-800/80 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
            Today&apos;s Tasks
          </p>
          <p className="mt-2 text-sm text-gray-400">
            {summary.remaining === 0
              ? "Everything is complete."
              : `${summary.remaining} still open.`}
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {summary.percentage}% done
        </span>
      </div>

      <ProgressBar completed={summary.completed} total={summary.total} />

      <div className="mt-4">
        <TaskList initialTasks={initialTasks} onTasksChange={setTasks} />
      </div>
    </section>
  );
}
