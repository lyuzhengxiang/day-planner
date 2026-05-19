"use client";

import { useState } from "react";
import ACCard from "@/components/ac/ACCard";
import ACSectionHeader from "@/components/ac/ACSectionHeader";
import FeatureToggle from "@/components/ac/FeatureToggle";
import Toggle from "@/components/ac/Toggle";
import { AC } from "@/lib/design-tokens";

interface RemindersCardProps {
  initial: {
    iMessagePhone: string;
    emailAddress: string;
    morningTime: string;
    middayTime: string;
    eveningTime: string;
  };
}

export default function RemindersCard({ initial }: RemindersCardProps) {
  const [data, setData] = useState(initial);
  const [reminders, setReminders] = useState({
    morning: true,
    midday: true,
    evening: true,
    weekly: true,
  });
  const [voice, setVoice] = useState(true);
  const [smart, setSmart] = useState(true);
  const [saved, setSaved] = useState(false);

  async function save(next: typeof data) {
    setData(next);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function field(key: keyof typeof data, label: string, placeholder: string) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            color: AC.dim,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
        <input
          value={data[key]}
          onChange={(e) => setData({ ...data, [key]: e.target.value })}
          onBlur={() => save(data)}
          placeholder={placeholder}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 13,
            color: AC.text,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>
    );
  }

  const cron = [
    { id: "morning", label: "Morning plan", time: data.morningTime, color: AC.orange },
    { id: "midday", label: "Midday nudge", time: data.middayTime, color: AC.cyan },
    { id: "evening", label: "Evening wrap-up", time: data.eveningTime, color: AC.purple },
    { id: "weekly", label: "Weekly review", time: "Sun 18:00", color: AC.red },
  ] as const;

  return (
    <ACCard>
      <ACSectionHeader
        label="Reminders"
        right={saved ? "saved" : "edit any field to save"}
      />
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: AC.dim,
          lineHeight: 1.5,
          marginBottom: 14,
        }}
      >
        The cron jobs below fire locally to deliver your plan. iMessage first, email as fallback.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {field("iMessagePhone", "iMessage phone", "+11234567890")}
        {field("emailAddress", "Email fallback", "you@example.com")}
        {field("morningTime", "Morning time", "06:30")}
        {field("middayTime", "Midday time", "12:30")}
        {field("eveningTime", "Evening time", "20:30")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cron.map((c) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto",
              gap: 14,
              alignItems: "center",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: c.color,
                boxShadow: `0 0 8px ${c.color}`,
              }}
            />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: AC.text }}>
                {c.label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: AC.dim,
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                }}
              >
                /api/cron/{c.id}
              </p>
            </div>
            <span
              style={{
                fontSize: 13,
                color: AC.dim,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {c.time}
            </span>
            <Toggle
              on={reminders[c.id as keyof typeof reminders]}
              onClick={() =>
                setReminders((r) => ({
                  ...r,
                  [c.id]: !r[c.id as keyof typeof reminders],
                }))
              }
              color={c.color}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <FeatureToggle
          label="Voice summary"
          sub="for Siri Shortcuts"
          on={voice}
          onClick={() => setVoice((v) => !v)}
          color={AC.cyan}
        />
        <FeatureToggle
          label="Smart prioritization"
          sub="re-orders urgent"
          on={smart}
          onClick={() => setSmart((v) => !v)}
          color={AC.green}
        />
      </div>
    </ACCard>
  );
}
