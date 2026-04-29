import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ACShell from "@/components/ac/ACShell";
import ACCard from "@/components/ac/ACCard";
import ACSectionHeader from "@/components/ac/ACSectionHeader";
import Eyebrow from "@/components/ac/Eyebrow";
import HeroRingStack from "@/components/ac/HeroRingStack";
import TimelineCard from "@/components/ac/today/TimelineCard";
import { AC, URGENCY_COLOR } from "@/lib/design-tokens";
import { getEventsForDate, parseDayParam } from "@/lib/planner";
import { computeThreeRings } from "@/lib/ring-stats";
import { prisma } from "@/lib/prisma";

interface HistoryDayPageProps {
  params: Promise<{ date: string }>;
}

export default async function HistoryDayPage({ params }: HistoryDayPageProps) {
  await connection();

  const { date } = await params;
  const parsedDate = parseDayParam(date);
  if (!parsedDate) notFound();

  const [plan, recurringEvents] = await Promise.all([
    prisma.dailyPlan.findUnique({
      where: { date: parsedDate },
      include: { tasks: { orderBy: { order: "asc" } } },
    }),
    prisma.recurringEvent.findMany({ where: { active: true } }),
  ]);
  if (!plan) notFound();

  const events = getEventsForDate(recurringEvents, plan.date);
  const rings = computeThreeRings(plan.tasks);

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
          <Eyebrow>Archived day</Eyebrow>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              margin: "2px 0 0",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {format(plan.date, "MMM d")}
          </h1>
          <p style={{ margin: "6px 0 0", color: AC.dim, fontSize: 14 }}>
            {format(plan.date, "EEEE")} · {plan.weatherSummary}
          </p>
        </div>
        <Link
          href="/history"
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            color: AC.text,
            fontSize: 13,
            fontWeight: 700,
            border: "1px solid rgba(255,255,255,0.1)",
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>
      </div>

      <ACCard
        style={{
          padding: 32,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 32,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <HeroRingStack
          values={[rings.done, rings.focus, rings.energy]}
          size={220}
          center={
            <>
              <span
                style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}
              >
                {rings.donePercent}
                <span style={{ fontSize: 22, color: AC.dim }}>%</span>
              </span>
              <Eyebrow style={{ fontSize: 11, marginTop: 4 }}>complete</Eyebrow>
              <span
                style={{
                  fontSize: 13,
                  color: AC.text,
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {rings.doneCount}/{rings.totalCount}
              </span>
            </>
          }
        />
        <div>
          <Eyebrow color={AC.orange}>Quote</Eyebrow>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 17,
              lineHeight: 1.55,
              color: AC.text,
              fontStyle: "italic",
            }}
          >
            {plan.quote || "(no quote on this day)"}
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: AC.dim }}>
            Streak at {plan.streakCount} day{plan.streakCount === 1 ? "" : "s"} on this date.
          </p>
        </div>
      </ACCard>

      <ACSectionHeader label="Timeline" right={`${events.length} block${events.length === 1 ? "" : "s"}`} />
      <ACCard style={{ marginBottom: 22 }}>
        <TimelineCard
          events={events.map((e) => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
          }))}
        />
      </ACCard>

      <ACSectionHeader label="Tasks" right={`${rings.doneCount}/${rings.totalCount}`} />
      {plan.tasks.length === 0 ? (
        <ACCard>
          <p style={{ margin: 0, fontSize: 14, color: AC.dim }}>No tasks recorded.</p>
        </ACCard>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {plan.tasks.map((task) => {
            const color = URGENCY_COLOR[task.urgency] || AC.cyan;
            return (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  background: task.completed
                    ? "rgba(28,28,30,0.4)"
                    : "rgba(28,28,30,0.85)",
                  border: `1px solid ${task.completed ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 16,
                  opacity: task.completed ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    border: `2px solid ${color}`,
                    background: task.completed ? color : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
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
                      fontSize: 11,
                      color,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {task.urgency}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ACShell>
  );
}
