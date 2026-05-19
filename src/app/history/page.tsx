import Link from "next/link";
import { format } from "date-fns";
import { connection } from "next/server";
import ACShell from "@/components/ac/ACShell";
import ACCard from "@/components/ac/ACCard";
import ACSectionHeader from "@/components/ac/ACSectionHeader";
import Eyebrow from "@/components/ac/Eyebrow";
import Ring from "@/components/ac/Ring";
import { AC } from "@/lib/design-tokens";
import { getHistoryStats } from "@/lib/history-stats";

const PERIODS = ["28d", "3m", "1y", "All"] as const;

export default async function HistoryPage() {
  await connection();

  const stats = await getHistoryStats(new Date(), 28);

  const avgPercent = Math.round(stats.avg * 100);
  const avgPerDay = (stats.totalDone / 28).toFixed(1);

  return (
    <ACShell>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Eyebrow>Past 28 days</Eyebrow>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              margin: "2px 0 0",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            History
          </h1>
          <p style={{ margin: "6px 0 0", color: AC.dim, fontSize: 14 }}>
            {format(stats.rangeStart, "MMM d")} – {format(stats.rangeEnd, "MMM d")} ·{" "}
            {stats.totalDone} task{stats.totalDone === 1 ? "" : "s"} completed
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map((p, i) => {
            const active = i === 0;
            return (
              <button
                key={p}
                disabled
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? AC.text : "rgba(255,255,255,0.1)"}`,
                  background: active ? AC.text : "transparent",
                  color: active ? "#0a0a0a" : AC.dim,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: active ? "default" : "not-allowed",
                  opacity: active ? 1 : 0.6,
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Avg completion"
          value={`${avgPercent}%`}
          color={AC.red}
          sub={`${stats.totalDone} of ${stats.totalTasks} done`}
          ringValue={stats.avg}
        />
        <StatCard
          label="Perfect days"
          value={`${stats.perfectDays}`}
          color={AC.green}
          sub="all tasks done"
        />
        <StatCard label="Avg per day" value={avgPerDay} color={AC.cyan} sub="tasks completed" />
        <StatCard
          label="Days logged"
          value={`${stats.heatmap.filter((d) => d.hasData).length}`}
          color={AC.orange}
          sub="of 28 days"
        />
      </div>

      <ACSectionHeader label="Calendar" right="darker = more complete" />
      <ACCard style={{ marginBottom: 22 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(28, 1fr)",
            gap: 4,
          }}
        >
          {stats.heatmap.map((d, i) => {
            const bg =
              d.total === 0
                ? "rgba(255,255,255,0.04)"
                : `rgba(255, 55, 95, ${0.18 + d.ratio * 0.7})`;
            return (
              <div
                key={i}
                title={`${format(d.date, "MMM d")}: ${d.completed}/${d.total}`}
                style={{
                  aspectRatio: "1 / 1",
                  background: bg,
                  borderRadius: 6,
                  border: d.isToday
                    ? `1.5px solid ${AC.text}`
                    : "1px solid rgba(255,255,255,0.04)",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: AC.dim,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span>{format(stats.rangeStart, "MMM d")}</span>
          <span>{format(stats.rangeEnd, "MMM d")} (today)</span>
        </div>
      </ACCard>

      <ACSectionHeader label="Recent days" right="click any day to open" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stats.recent.length === 0 ? (
          <ACCard>
            <p style={{ margin: 0, fontSize: 14, color: AC.dim }}>
              No saved days yet. Generate a plan from the Today screen to start tracking.
            </p>
          </ACCard>
        ) : (
          stats.recent.map((d) => {
            const slug = format(d.date, "yyyy-MM-dd");
            const ringColor = d.ratio === 1 && d.total > 0 ? AC.green : AC.red;
            return (
              <Link
                key={d.id}
                href={`/history/${slug}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <ACCard
                  style={{
                    padding: "14px 18px",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                    <Ring size={48} stroke={5} value={d.ratio} color={ringColor} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: AC.text,
                      }}
                    >
                      {Math.round(d.ratio * 100)}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: AC.text }}>
                        {format(d.date, "EEEE, MMM d")}
                      </p>
                      {d.isToday && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: AC.red,
                            color: "#0a0a0a",
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: AC.dim }}>
                      {d.weatherSummary}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {Array.from({ length: Math.min(d.total, 12) }).map((_, j) => (
                      <span
                        key={j}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          background: j < d.completed ? AC.green : "rgba(255,255,255,0.1)",
                          boxShadow: j < d.completed ? `0 0 6px ${AC.green}` : "none",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: AC.text,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {d.completed}/{d.total}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: AC.dim }}>tasks done</p>
                  </div>
                </ACCard>
              </Link>
            );
          })
        )}
      </div>
    </ACShell>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
  ringValue?: number;
}

function StatCard({ label, value, sub, color, ringValue }: StatCardProps) {
  return (
    <ACCard style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {ringValue !== undefined ? (
          <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
            <Ring size={48} stroke={5} value={ringValue} color={color} glow />
          </div>
        ) : (
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: color,
              boxShadow: `0 0 8px ${color}`,
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <Eyebrow style={{ fontSize: 11 }}>{label}</Eyebrow>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: AC.text,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: AC.dim }}>{sub}</p>
        </div>
      </div>
    </ACCard>
  );
}
