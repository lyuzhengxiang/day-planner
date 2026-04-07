"use client";

import { useState } from "react";

interface RecurringEvent {
  id: number;
  title: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface RecurringManagerProps {
  initialEvents: RecurringEvent[];
}

export default function RecurringManager({
  initialEvents,
}: RecurringManagerProps) {
  const [events, setEvents] = useState<RecurringEvent[]>(initialEvents);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    days: [] as number[],
    startTime: "",
    endTime: "",
  });

  async function handleAdd() {
    if (!form.title || form.days.length === 0 || !form.startTime || !form.endTime)
      return;
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        daysOfWeek: form.days.join(","),
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    });
    const created = (await res.json()) as RecurringEvent;
    setForm({ title: "", days: [], startTime: "", endTime: "" });
    setAdding(false);
    setEvents((previous) => [created, ...previous]);
  }

  async function handleToggle(event: RecurringEvent) {
    const res = await fetch("/api/recurring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, active: !event.active }),
    });
    const updated = (await res.json()) as RecurringEvent;
    setEvents((previous) =>
      previous.map((current) =>
        current.id === updated.id ? updated : current
      )
    );
  }

  async function handleDelete(id: number) {
    await fetch("/api/recurring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEvents((previous) => previous.filter((event) => event.id !== id));
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day)
        ? f.days.filter((d) => d !== day)
        : [...f.days, day].sort(),
    }));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[10px] uppercase tracking-widest text-gray-600">
          Recurring Events
        </h2>
        <button
          onClick={() => setAdding(!adding)}
          className="text-sm text-green-500 hover:text-green-400"
        >
          {adding ? "cancel" : "+ add"}
        </button>
      </div>

      {adding && (
        <div className="border border-gray-800 rounded p-3 mb-4 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Event title"
            className="w-full bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-1"
          />
          <div className="flex gap-1">
            {dayLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`text-[10px] px-2 py-1 rounded ${
                  form.days.includes(i)
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "text-gray-600 border border-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-1"
            />
            <span className="text-gray-600">to</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-1"
            />
          </div>
          <button
            onClick={handleAdd}
            className="text-sm text-green-500 border border-green-500/30 rounded px-3 py-1"
          >
            save
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-gray-600 text-sm">No recurring events.</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className={`flex items-center justify-between py-2 group ${
                !e.active ? "opacity-50" : ""
              }`}
            >
              <div>
                <span className="text-sm text-gray-200">{e.title}</span>
                <span className="text-xs text-gray-600 ml-2">
                  {e.daysOfWeek
                    .split(",")
                    .map((d) => dayLabels[Number(d)])
                    .join(", ")}{" "}
                  {e.startTime}&ndash;{e.endTime}
                </span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleToggle(e)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  {e.active ? "pause" : "resume"}
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-xs text-gray-500 hover:text-red-400"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
