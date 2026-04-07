"use client";

import { useState } from "react";

interface TaskItemProps {
  id: number;
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
  rolledDays: number;
  readOnly?: boolean;
  onToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const urgencyColors: Record<string, { dot: string; badge: string; bg: string }> = {
  URGENT: { dot: "bg-red-500", badge: "text-red-500", bg: "bg-red-500/10" },
  HIGH: { dot: "bg-amber-500", badge: "text-amber-500", bg: "bg-amber-500/10" },
  MEDIUM: { dot: "bg-blue-400", badge: "text-blue-400", bg: "bg-blue-400/10" },
  LOW: { dot: "bg-gray-500", badge: "text-gray-500", bg: "bg-gray-500/10" },
};

export default function TaskItem({
  id,
  text,
  urgency,
  completed,
  rolledOver,
  rolledDays,
  readOnly = false,
  onToggle,
  onDelete,
}: TaskItemProps) {
  const [loading, setLoading] = useState(false);
  const colors = urgencyColors[urgency] || urgencyColors.MEDIUM;

  async function handleToggle() {
    if (readOnly || loading) return;
    setLoading(true);
    await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    onToggle?.(id);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 py-2 group">
      <button
        onClick={handleToggle}
        disabled={readOnly || loading}
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
          completed
            ? "bg-green-500 border-green-500"
            : `border-current ${colors.dot.replace("bg-", "text-")}`
        } ${readOnly ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
      >
        {completed && (
          <svg viewBox="0 0 16 16" className="w-full h-full text-[#0a0a0a]">
            <path fill="currentColor" d="M6.5 11.5L3 8l1-1 2.5 2.5L12 4l1 1z" />
          </svg>
        )}
      </button>

      <span
        className={`flex-1 text-sm ${
          completed ? "text-gray-600 line-through" : "text-gray-200"
        }`}
      >
        {text}
      </span>

      {rolledOver && rolledDays >= 3 && (
        <span className="text-[10px] text-red-400">{rolledDays}d overdue</span>
      )}
      {rolledOver && rolledDays < 3 && (
        <span className="text-[10px] text-gray-500">rolled</span>
      )}

      <span
        className={`text-[9px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.badge} uppercase tracking-wider`}
      >
        {urgency}
      </span>

      {!readOnly && onDelete && (
        <button
          onClick={() => onDelete(id)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity"
        >
          x
        </button>
      )}
    </div>
  );
}
