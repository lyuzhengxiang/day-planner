"use client";

import { useState } from "react";
import { AC, URGENCY_COLOR } from "@/lib/design-tokens";

export interface TaskShape {
  id: number;
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
  rolledDays: number;
}

type Filter = "all" | "open" | "urgent" | "done";

interface TasksGridProps {
  initialTasks: TaskShape[];
}

export default function TasksGrid({ initialTasks }: TasksGridProps) {
  const [tasks, setTasks] = useState<TaskShape[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<Set<number>>(new Set());

  const counts = {
    all: tasks.length,
    open: tasks.filter((t) => !t.completed).length,
    urgent: tasks.filter((t) => t.urgency === "URGENT" && !t.completed).length,
    done: tasks.filter((t) => t.completed).length,
  };

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "open") return !t.completed;
    if (filter === "done") return t.completed;
    if (filter === "urgent") return t.urgency === "URGENT";
    return true;
  });

  async function toggle(id: number) {
    if (pending.has(id)) return;
    setPending((s) => new Set(s).add(id));
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    try {
      await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${counts.all}` },
    { id: "open", label: `Open ${counts.open}` },
    { id: "urgent", label: `Urgent ${counts.urgent}` },
    { id: "done", label: `Done ${counts.done}` },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px 10px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            color: AC.text,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Tasks
        </h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? AC.text : "rgba(255,255,255,0.1)"}`,
                  background: active ? AC.text : "transparent",
                  color: active ? "#0a0a0a" : AC.dim,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: AC.dim, padding: "8px 4px" }}>
          {filter === "done" ? "Nothing completed yet." : "No tasks match this filter."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((task) => {
            const color = URGENCY_COLOR[task.urgency] || AC.cyan;
            return (
              <div
                key={task.id}
                onClick={() => toggle(task.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  background: task.completed ? "rgba(28,28,30,0.4)" : "rgba(28,28,30,0.85)",
                  border: `1px solid ${task.completed ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 16,
                  cursor: "pointer",
                  opacity: task.completed ? 0.6 : 1,
                  transition: "background 150ms ease, border-color 150ms ease",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    border: `2px solid ${color}`,
                    background: task.completed ? color : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: task.completed ? `0 0 12px ${color}` : "none",
                  }}
                >
                  {task.completed && (
                    <span style={{ color: "#0a0a0a", fontSize: 14, fontWeight: 800 }}>✓</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.35,
                      color: task.completed ? AC.dim : AC.text,
                      textDecoration: task.completed ? "line-through" : "none",
                      fontWeight: 500,
                    }}
                  >
                    {task.text}
                  </p>
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      fontSize: 11,
                      color: AC.dim,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <span style={{ color, fontWeight: 700, letterSpacing: "0.1em" }}>
                      {task.urgency}
                    </span>
                    {task.rolledOver && (
                      <span style={{ color: task.rolledDays >= 3 ? AC.red : AC.dim }}>
                        {task.rolledDays >= 3 ? `${task.rolledDays}d overdue` : "rolled"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
