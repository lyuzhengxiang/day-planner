"use client";

import { useEffect, useState } from "react";
import { AC, KIND_COLOR } from "@/lib/design-tokens";

export interface TimelineEvent {
  title: string;
  startTime: string;
  endTime: string;
  kind?: string;
}

function timeStrToHours(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

function fmtHour(h: number): string {
  const hour = Math.floor(h);
  const m = Math.round((h - hour) * 60);
  const display = hour % 12 || 12;
  const ap = hour >= 12 ? "p" : "a";
  return `${display}:${m.toString().padStart(2, "0")}${ap}`;
}

function inferKind(title: string): string {
  const t = title.toLowerCase();
  if (/(workout|gym|run|yoga|meditat|sleep|wake)/.test(t)) return "wellness";
  if (/(study|read|learn|class|lecture)/.test(t)) return "learning";
  return "work";
}

interface TimelineCardProps {
  events: TimelineEvent[];
  sunrise?: string;
  sunset?: string;
}

export default function TimelineCard({ events, sunrise = "06:30", sunset = "19:30" }: TimelineCardProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      const d = new Date();
      setNow(d.getHours() + d.getMinutes() / 60);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const startHour = 5;
  const endHour = 23;
  const span = endHour - startHour;
  const pct = (h: number) => ((h - startHour) / span) * 100;
  const sunriseP = pct(timeStrToHours(sunrise));
  const sunsetP = pct(timeStrToHours(sunset));
  const nowPct = now !== null ? Math.max(0, Math.min(100, pct(now))) : null;

  return (
    <div>
      <div style={{ position: "relative", height: 80 }}>
        <div
          style={{
            position: "absolute",
            left: `${Math.max(0, sunriseP)}%`,
            right: `${Math.max(0, 100 - sunsetP)}%`,
            top: 0,
            bottom: 30,
            background:
              "linear-gradient(180deg, rgba(255,159,10,0.16), rgba(255,159,10,0))",
            borderRadius: 8,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 38,
            height: 4,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 2,
          }}
        />
        {[6, 9, 12, 15, 18, 21].map((h) => (
          <div
            key={h}
            style={{
              position: "absolute",
              left: `${pct(h)}%`,
              top: 6,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 10, color: AC.dim, fontVariantNumeric: "tabular-nums" }}>
              {h % 12 || 12}
              {h >= 12 ? "p" : "a"}
            </span>
            <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.18)" }} />
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            left: `${sunriseP}%`,
            top: 0,
            transform: "translateX(-50%)",
            color: AC.orange,
            fontSize: 12,
          }}
        >
          ☀
        </div>
        <div
          style={{
            position: "absolute",
            left: `${sunsetP}%`,
            top: 0,
            transform: "translateX(-50%)",
            color: AC.purple,
            fontSize: 12,
          }}
        >
          ☾
        </div>

        {events.map((e, i) => {
          const left = pct(timeStrToHours(e.startTime));
          const right = pct(timeStrToHours(e.endTime));
          const w = Math.max(2, right - left);
          const kind = e.kind || inferKind(e.title);
          const color = KIND_COLOR[kind] || KIND_COLOR.default;
          return (
            <div
              key={i}
              title={`${e.title} · ${e.startTime}–${e.endTime}`}
              style={{
                position: "absolute",
                left: `${left}%`,
                width: `${w}%`,
                top: 34,
                height: 12,
                background: color,
                borderRadius: 6,
                boxShadow: `0 0 14px ${color}`,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: 0,
                  fontSize: 10,
                  color: AC.dim,
                  whiteSpace: "nowrap",
                }}
              >
                {e.title}
              </span>
            </div>
          );
        })}

        {nowPct !== null && (
          <div
            style={{
              position: "absolute",
              left: `${nowPct}%`,
              top: 18,
              bottom: 0,
              width: 2,
              background: AC.red,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -16,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                color: AC.red,
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              NOW
            </span>
          </div>
        )}
      </div>
      {events.length === 0 && (
        <p style={{ marginTop: 12, fontSize: 12, color: AC.dim }}>
          No recurring events scheduled for today.
        </p>
      )}
    </div>
  );
}

export { fmtHour };
