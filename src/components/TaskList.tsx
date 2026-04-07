"use client";

import { useState } from "react";
import TaskItem from "./TaskItem";

interface Task {
  id: number;
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
  rolledDays: number;
}

interface TaskListProps {
  initialTasks: Task[];
  readOnly?: boolean;
  onTasksChange?: (tasks: Task[]) => void;
}

export default function TaskList({
  initialTasks,
  readOnly = false,
  onTasksChange,
}: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");

  function updateTasks(updater: (previous: Task[]) => Task[]) {
    setTasks((previous) => {
      const next = updater(previous);
      onTasksChange?.(next);
      return next;
    });
  }

  function handleToggle(id: number) {
    updateTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  async function handleDelete(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    updateTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleAdd() {
    if (!newTask.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newTask }),
    });
    const task = await res.json();
    updateTasks((prev) => [
      ...prev,
      { ...task, rolledOver: false, rolledDays: 0 },
    ]);
    setNewTask("");
    setAdding(false);
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          {...task}
          readOnly={readOnly}
          onToggle={handleToggle}
          onDelete={readOnly ? undefined : handleDelete}
        />
      ))}

      {!readOnly &&
        (adding ? (
          <div className="flex gap-2 mt-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a task..."
              autoFocus
              className="flex-1 bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-1"
            />
            <button onClick={handleAdd} className="text-green-500 text-sm">
              add
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewTask("");
              }}
              className="text-gray-600 text-sm"
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-gray-600 text-sm mt-2 hover:text-gray-400 transition-colors"
          >
            + add task
          </button>
        ))}
    </div>
  );
}
