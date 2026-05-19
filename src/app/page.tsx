import Link from "next/link";
import { format, startOfDay } from "date-fns";
import { connection } from "next/server";
import ACShell from "@/components/ac/ACShell";
import ACCard from "@/components/ac/ACCard";
import ACSectionHeader from "@/components/ac/ACSectionHeader";
import Eyebrow from "@/components/ac/Eyebrow";
import HeroRingStack from "@/components/ac/HeroRingStack";
import Ring from "@/components/ac/Ring";
import RegenerateButton from "@/components/ac/RegenerateButton";
import TimelineCard from "@/components/ac/today/TimelineCard";
import TasksGrid from "@/components/ac/today/TasksGrid";
import { AC, GOAL_RING_COLORS } from "@/lib/design-tokens";
import { getEventsForDate, needsContactSetup } from "@/lib/planner";
import { computeThreeRings, pickNextTask } from "@/lib/ring-stats";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  await connection();

  const today = startOfDay(new Date());

  const [settings, plan, recurringEvents, goals] = await Promise.all([
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    }),
    prisma.dailyPlan.findUnique({
      where: { date: today },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: { weeklyGoal: { select: { id: true, text: true } } },
        },
      },
    }),
    prisma.recurringEvent.findMany({ where: { active: true } }),
    prisma.weeklyGoal.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const showFirstRun = needsContactSetup(settings);
  const dayLabel = format(today, "EEEE");
  const dateLong = format(today, "MMMM d");

  if (!plan) {
    return (
      <ACShell>
        <div style={{ marginBottom: 24 }}>
          <Eyebrow>{dayLabel}</Eyebrow>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              margin: "2px 0 0",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {dateLong}
          </h1>
          <p style={{ margin: "6px 0 0", color: AC.dim, fontSize: 14 }}>
            No plan generated yet for today.
          </p>
        </div>

        {showFirstRun && (
          <ACCard style={{ marginBottom: 18, borderColor: "rgba(255,159,10,0.25)" }}>
            <Eyebrow color={AC.orange}>First-run setup</Eyebrow>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: AC.text, lineHeight: 1.5 }}>
              Add an iMessage number or email under{" "}
              <Link
                href="/settings"
                style={{ color: AC.orange, textDecoration: "underline" }}
              >
                Settings
              </Link>{" "}
              to receive plan deliveries.
            </p>
          </ACCard>
        )}

        <ACCard
          style={{
            padding: "32px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <Eyebrow>Today</Eyebrow>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: AC.text }}>
            Generate today&apos;s task list from your weekly goals, recurring schedule, weather, and
            carry-over work.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <RegenerateButton label="Generate today's plan" />
            <Link
              href="/week"
              style={{
                fontSize: 13,
                color: AC.dim,
                textDecoration: "none",
              }}
            >
              {goals.length > 0
                ? `Review ${goals.length} active weekly goal${goals.length === 1 ? "" : "s"} →`
                : "Set weekly goals first →"}
            </Link>
          </div>
        </ACCard>
      </ACShell>
    );
  }

  const todaysEvents = getEventsForDate(recurringEvents, plan.date);
  const rings = computeThreeRings(plan.tasks);
  const next = pickNextTask(plan.tasks);

  const tasksByGoal = new Map<number, { done: number; total: number }>();
  for (const t of plan.tasks) {
    const gid = t.weeklyGoalId;
    if (gid == null) continue;
    const entry = tasksByGoal.get(gid) || { done: 0, total: 0 };
    entry.total += 1;
    if (t.completed) entry.done += 1;
    tasksByGoal.set(gid, entry);
  }

  const ringDefs = [
    {
      label: "Done",
      color: AC.red,
      value: rings.done,
      detail: `${rings.doneCount} / ${rings.totalCount}`,
    },
    {
      label: "Focus",
      color: AC.green,
      value: rings.focus,
      detail:
        rings.focusTotal > 0 ? `${rings.focusDone} / ${rings.focusTotal} priority` : "no priority",
    },
    {
      label: "Energy",
      color: AC.cyan,
      value: rings.energy,
      detail:
        rings.energyTotal > 0 ? `${rings.energyDone} / ${rings.energyTotal} other` : "no other",
    },
  ];

  return (
    <ACShell>
      {/* Header */}
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
          <Eyebrow>{dayLabel}</Eyebrow>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              margin: "2px 0 0",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {dateLong}
          </h1>
          <p style={{ margin: "6px 0 0", color: AC.dim, fontSize: 14 }}>{plan.weatherSummary}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <Eyebrow style={{ fontSize: 11 }}>Streak</Eyebrow>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: `linear-gradient(135deg, ${AC.orange}, ${AC.red})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {plan.streakCount} {plan.streakCount === 1 ? "day" : "days"}
            </span>
          </div>
          <RegenerateButton />
        </div>
      </div>

      {/* Hero rings */}
      <ACCard
        style={{
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 36,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <HeroRingStack
          values={[rings.done, rings.focus, rings.energy]}
          center={
            <>
              <span
                style={{
                  fontSize: 60,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {rings.donePercent}
                <span style={{ fontSize: 28, color: AC.dim }}>%</span>
              </span>
              <Eyebrow style={{ fontSize: 11, marginTop: 4 }}>complete</Eyebrow>
            </>
          }
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ringDefs.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  background: r.color,
                  boxShadow: `0 0 10px ${r.color}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Eyebrow style={{ fontSize: 12 }}>{r.label}</Eyebrow>
                  <span
                    style={{
                      fontSize: 13,
                      color: AC.text,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {r.detail}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    height: 6,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round(r.value * 100)}%`,
                      background: r.color,
                      borderRadius: 3,
                      boxShadow: `0 0 8px ${r.color}`,
                      transition: "width 600ms cubic-bezier(.4,0,.2,1)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {next && (
            <div
              style={{
                marginTop: 8,
                padding: 16,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, rgba(255,55,95,0.12), rgba(255,159,10,0.06))",
                border: "1px solid rgba(255,55,95,0.25)",
              }}
            >
              <Eyebrow color={AC.red} style={{ fontSize: 11, fontWeight: 800 }}>
                ↗ Next up
              </Eyebrow>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 16,
                  fontWeight: 600,
                  color: AC.text,
                  lineHeight: 1.3,
                }}
              >
                {next.text}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: AC.dim }}>
                {next.urgency}
                {next.rolledOver && next.rolledDays >= 1
                  ? ` · ${next.rolledDays}d overdue`
                  : ""}
              </p>
            </div>
          )}
        </div>
      </ACCard>

      {/* Quote band */}
      {plan.quote && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 18px",
            marginBottom: 18,
            borderRadius: 16,
            background: "rgba(255,159,10,0.06)",
            borderLeft: `3px solid ${AC.orange}`,
          }}
        >
          <span style={{ fontSize: 18, color: AC.orange }}>&ldquo;</span>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: AC.text,
              lineHeight: 1.45,
              flex: 1,
              fontStyle: "italic",
            }}
          >
            {plan.quote}
          </p>
        </div>
      )}

      {/* Timeline */}
      <ACSectionHeader label="Today's timeline" right={`${todaysEvents.length} block${todaysEvents.length === 1 ? "" : "s"}`} />
      <ACCard style={{ marginBottom: 22 }}>
        <TimelineCard
          events={todaysEvents.map((e) => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
          }))}
        />
      </ACCard>

      {/* Tasks */}
      <TasksGrid initialTasks={plan.tasks} />

      {/* Goals */}
      {goals.length > 0 && (
        <>
          <ACSectionHeader
            label="Weekly goals"
            right={`${goals.length} active`}
            style={{ marginTop: 28 }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {goals.slice(0, 6).map((g, i) => {
              const stats = tasksByGoal.get(g.id) || { done: 0, total: 0 };
              const progress = stats.total > 0 ? stats.done / stats.total : 0;
              const color = GOAL_RING_COLORS[i % GOAL_RING_COLORS.length];
              return (
                <ACCard key={g.id} style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                      <Ring size={56} stroke={6} value={progress} color={color} />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: AC.text,
                        }}
                      >
                        {Math.round(progress * 100)}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.35,
                        color: AC.text,
                        fontWeight: 500,
                      }}
                    >
                      {g.text}
                    </p>
                  </div>
                </ACCard>
              );
            })}
          </div>
        </>
      )}
    </ACShell>
  );
}
