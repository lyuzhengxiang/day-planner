import { addDays, format, getISOWeek, startOfWeek } from "date-fns";
import { connection } from "next/server";
import ACShell from "@/components/ac/ACShell";
import ACCard from "@/components/ac/ACCard";
import ACSectionHeader from "@/components/ac/ACSectionHeader";
import Eyebrow from "@/components/ac/Eyebrow";
import Ring from "@/components/ac/Ring";
import GoalSetupPanel from "@/components/GoalSetupPanel";
import { AC, GOAL_RING_COLORS } from "@/lib/design-tokens";
import { getWeekStats } from "@/lib/week-stats";
import { prisma } from "@/lib/prisma";

const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export default async function WeekPage() {
  await connection();

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(currentWeekStart, 6);
  const isoWeek = getISOWeek(now);
  const year = now.getFullYear();

  const [goals, previousReflection, weekStats] = await Promise.all([
    prisma.weeklyGoal.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      include: { tasks: { select: { completed: true } } },
    }),
    prisma.weeklyReflection.findFirst({
      where: { weekStart: { lt: currentWeekStart } },
      orderBy: { weekStart: "desc" },
    }),
    getWeekStats(now),
  ]);

  const carryForward = previousReflection
    ? (JSON.parse(previousReflection.carryForward) as string[])
    : [];

  const sortedGoals = [...goals].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
  );

  const goalsWithProgress = sortedGoals.map((g, i) => {
    const total = g.tasks.length;
    const done = g.tasks.filter((t) => t.completed).length;
    return {
      ...g,
      progress: total > 0 ? done / total : 0,
      tasksDone: done,
      tasksTotal: total,
      color: GOAL_RING_COLORS[i % GOAL_RING_COLORS.length],
    };
  });

  const overallTotal = goalsWithProgress.reduce((s, g) => s + g.tasksTotal, 0);
  const overallDone = goalsWithProgress.reduce((s, g) => s + g.tasksDone, 0);
  const combined = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

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
          <Eyebrow>
            Week {isoWeek} · {year}
          </Eyebrow>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              margin: "2px 0 0",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Goals
          </h1>
          <p style={{ margin: "6px 0 0", color: AC.dim, fontSize: 14 }}>
            {format(currentWeekStart, "MMM d")} – {format(weekEnd, "MMM d")} · {goals.length}{" "}
            active · {combined}% combined
          </p>
        </div>
        <a
          href="#goal-setup"
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            background: AC.text,
            color: "#0a0a0a",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          + New goal
        </a>
      </div>

      <ACCard style={{ marginBottom: 22 }}>
        <ACSectionHeader
          label="This week"
          right={`${weekStats.days[weekStats.todayIndex]?.dayLabel ?? ""} · day ${weekStats.todayIndex + 1} of 7`}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 10,
          }}
        >
          {weekStats.days.map((d, i) => {
            const isToday = i === weekStats.todayIndex;
            const isPast = i < weekStats.todayIndex;
            const showRing = (isPast || isToday) && d.hasData;
            const ringColor = isToday ? AC.red : AC.green;
            return (
              <div
                key={i}
                style={{
                  padding: "14px 10px",
                  borderRadius: 16,
                  background: isToday ? "rgba(255,55,95,0.10)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isToday ? "rgba(255,55,95,0.4)" : "rgba(255,255,255,0.06)"}`,
                  position: "relative",
                }}
              >
                <Eyebrow style={{ fontSize: 11, letterSpacing: "0.16em" }}>{d.dayShort}</Eyebrow>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 22,
                    fontWeight: 800,
                    color: isToday || isPast ? AC.text : AC.faint,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {d.dayNumber}
                </p>
                <div style={{ position: "relative", marginTop: 10, width: 32, height: 32 }}>
                  {showRing ? (
                    <Ring size={32} stroke={4} value={d.ratio} color={ringColor} />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        border: "1.5px dashed rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                  {showRing && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: ringColor,
                      }}
                    >
                      {Math.round(d.ratio * 100)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ACCard>

      <ACSectionHeader label="Active goals" right={goals.length === 0 ? "none yet" : "ranked by priority"} />
      <div
        style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}
      >
        {goalsWithProgress.length === 0 ? (
          <ACCard>
            <p style={{ margin: 0, fontSize: 14, color: AC.dim }}>
              No active goals yet. Use the AI setup below to generate this week&apos;s focus.
            </p>
          </ACCard>
        ) : (
          goalsWithProgress.map((g) => (
            <ACCard key={g.id} style={{ padding: "18px 22px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 18,
                  alignItems: "center",
                }}
              >
                <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                  <Ring size={64} stroke={7} value={g.progress} color={g.color} glow />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      color: AC.text,
                    }}
                  >
                    {Math.round(g.progress * 100)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: `${g.color}22`,
                        color: g.color,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                      }}
                    >
                      {g.priority}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: AC.dim,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {g.tasksDone}/{g.tasksTotal} task{g.tasksTotal === 1 ? "" : "s"} done
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 600,
                      color: AC.text,
                      lineHeight: 1.3,
                    }}
                  >
                    {g.text}
                  </p>
                  <div
                    style={{
                      marginTop: 10,
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.round(g.progress * 100)}%`,
                        background: g.color,
                        boxShadow: `0 0 10px ${g.color}`,
                        transition: "width 600ms cubic-bezier(.4,0,.2,1)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </ACCard>
          ))
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <ACCard>
          <ACSectionHeader label="Carry forward" right="from last week" />
          {carryForward.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: AC.dim }}>
              Nothing rolled over from last week.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {carryForward.map((c, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 12,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: AC.orange,
                      boxShadow: `0 0 6px ${AC.orange}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: AC.text, flex: 1, lineHeight: 1.4 }}>
                    {c}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ACCard>

        <ACCard>
          <div id="goal-setup" />
          <ACSectionHeader label="AI goal setup" right="60s flow" />
          <p style={{ margin: 0, fontSize: 14, color: AC.dim, lineHeight: 1.5 }}>
            Answer a few narrowing questions and the planner proposes a compact goal set.
          </p>
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(10,215,255,0.12), rgba(168,255,53,0.06))",
              border: "1px solid rgba(10,215,255,0.25)",
            }}
          >
            <GoalSetupPanel />
          </div>
        </ACCard>
      </div>
    </ACShell>
  );
}
