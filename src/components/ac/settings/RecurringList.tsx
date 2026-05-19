"use client";

import { useState } from "react";
import Toggle from "@/components/ac/Toggle";
import { AC, KIND_COLOR } from "@/lib/design-tokens";

interface RecurringEvent {
  id: number;
  title: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function inferKind(title: string): string {
  const t = title.toLowerCase();
  if (/(workout|gym|run|yoga|meditat|sleep|wake)/.test(t)) return "wellness";
  if (/(study|read|learn|class|lecture)/.test(t)) return "learning";
  return "work";
}

interface RecurringListProps {
  initial: RecurringEvent[];
}

export default function RecurringList({ initial }: RecurringListProps) {
  const [events, setEvents] = useState<RecurringEvent[]>(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    days: [] as number[],
    startTime: "09:00",
    endTime: "10:00",
  });

  async function toggle(e: RecurringEvent) {
    setEvents((prev) =>
      prev.map((x) => (x.id === e.id ? { ...x, active: !x.active } : x))
    );
    await fetch("/api/recurring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id, active: !e.active }),
    });
  }

  async function remove(id: number) {
    setEvents((prev) => prev.filter((x) => x.id !== id));
    await fetch("/api/recurring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function add() {
    if (!form.title || form.days.length === 0) return;
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
    setEvents((prev) => [created, ...prev]);
    setForm({ title: "", days: [], startTime: "09:00", endTime: "10:00" });
    setAdding(false);
  }

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort(),
    }));
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: AC.dim }}>
            No recurring events yet.
          </p>
        ) : (
          events.map((e) => {
            const kind = inferKind(e.title);
            const c = KIND_COLOR[kind] || KIND_COLOR.default;
            const dayLabels = e.daysOfWeek
              .split(",")
              .map((d) => DAY_LABELS[Number(d)])
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto auto 1fr auto auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "12px 16px",
                  background: e.active ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity: e.active ? 1 : 0.55,
                  transition: "opacity 150ms ease",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: c,
                    boxShadow: e.active ? `0 0 6px ${c}` : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: AC.dim,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    minWidth: 110,
                  }}
                >
                  {e.startTime}–{e.endTime}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: AC.text }}>
                    {e.title}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: AC.dim }}>
                    {dayLabels} · {kind}
                  </p>
                </div>
                <button
                  onClick={() => remove(e.id)}
                  aria-label="Delete"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: AC.dim,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
                <Toggle on={e.active} onClick={() => toggle(e)} color={c} />
              </div>
            );
          })
        )}
      </div>

      {adding && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Event title (e.g. Workout)"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 13,
              color: AC.text,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAY_LABELS.map((label, i) => {
              const on = form.days.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  style={{
                    fontSize: 11,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: on ? AC.text : "transparent",
                    color: on ? "#0a0a0a" : AC.dim,
                    border: `1px solid ${on ? AC.text : "rgba(255,255,255,0.1)"}`,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 13,
                color: AC.text,
                outline: "none",
              }}
            />
            <span style={{ color: AC.dim, fontSize: 13 }}>to</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 13,
                color: AC.text,
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={add}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                background: AC.text,
                color: "#0a0a0a",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                background: "transparent",
                color: AC.dim,
                fontSize: 13,
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 12,
            width: "100%",
            background: "transparent",
            color: AC.text,
            fontSize: 13,
            fontWeight: 700,
            border: "1px dashed rgba(255,255,255,0.18)",
            cursor: "pointer",
          }}
        >
          + Add recurring event
        </button>
      )}
    </div>
  );
}
