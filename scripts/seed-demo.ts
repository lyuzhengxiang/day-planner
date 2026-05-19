import { PrismaClient } from "@prisma/client";
import { addDays, startOfDay, startOfWeek, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  await prisma.task.deleteMany({});
  await prisma.dailyPlan.deleteMany({});
  await prisma.weeklyGoal.deleteMany({});
  await prisma.goalSession.deleteMany({});
  await prisma.recurringEvent.deleteMany({});
  await prisma.weeklyReflection.deleteMany({});
  await prisma.quoteLog.deleteMany({});

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      iMessagePhone: "+15551234567",
      emailAddress: "sam@example.com",
      morningTime: "06:30",
      middayTime: "12:30",
      eveningTime: "20:30",
      timezone: "America/Chicago",
      macLocalIp: "192.168.1.42",
      appPort: "3000",
    },
    create: {
      id: 1,
      iMessagePhone: "+15551234567",
      emailAddress: "sam@example.com",
      timezone: "America/Chicago",
      macLocalIp: "192.168.1.42",
    },
  });

  const session = await prisma.goalSession.create({
    data: {
      initialInput: "demo",
      questions: "[]",
      status: "DONE",
    },
  });

  const goalsData = [
    {
      text: "Ship Day Planner v1 to production by Friday",
      priority: "URGENT",
      taskCount: 6,
      doneCount: 4,
    },
    {
      text: "Cardio + strength 4x this week",
      priority: "HIGH",
      taskCount: 4,
      doneCount: 2,
    },
    {
      text: "Finish the database systems midterm review",
      priority: "MEDIUM",
      taskCount: 5,
      doneCount: 3,
    },
  ];

  const goals = await Promise.all(
    goalsData.map((g) =>
      prisma.weeklyGoal.create({
        data: {
          goalSessionId: session.id,
          text: g.text,
          priority: g.priority,
          weekStart,
          active: true,
        },
      })
    )
  );

  const recurringData = [
    { title: "Morning workout", days: "1,2,3,4,5", start: "07:00", end: "08:00" },
    { title: "Standup", days: "1,2,3,4,5", start: "09:30", end: "10:00" },
    { title: "Deep work block", days: "1,3,5", start: "10:00", end: "12:00" },
    { title: "Class — Database systems", days: "2,4", start: "13:30", end: "15:00" },
    { title: "Reading hour", days: "1,2,3,4,5", start: "21:00", end: "22:00" },
  ];

  for (const r of recurringData) {
    await prisma.recurringEvent.create({
      data: {
        title: r.title,
        daysOfWeek: r.days,
        startTime: r.start,
        endTime: r.end,
        active: true,
      },
    });
  }

  for (let dayOffset = 13; dayOffset >= 1; dayOffset--) {
    const date = subDays(today, dayOffset);
    if (date < subDays(today, 27)) continue;
    const taskCount = 4 + Math.floor(Math.random() * 5);
    const doneRatio = 0.4 + Math.random() * 0.55;
    const completedCount = Math.round(taskCount * doneRatio);

    const plan = await prisma.dailyPlan.create({
      data: {
        date,
        quote: "Pick the next right thing.",
        weatherSummary: "Chicago, IL · 42°F · Cloudy",
        markdownPath: "",
        streakCount: Math.max(0, 14 - dayOffset),
      },
    });

    const urgencies = ["URGENT", "HIGH", "MEDIUM", "MEDIUM", "LOW"];
    for (let i = 0; i < taskCount; i++) {
      const goal = goals[i % goals.length];
      await prisma.task.create({
        data: {
          dailyPlanId: plan.id,
          weeklyGoalId: goal.id,
          text: sampleTaskText(i),
          urgency: urgencies[i % urgencies.length],
          completed: i < completedCount,
          rolledOver: false,
          rolledDays: 0,
          order: i,
        },
      });
    }
  }

  const todayPlan = await prisma.dailyPlan.create({
    data: {
      date: today,
      quote: "The only limit to our realization of tomorrow will be our doubts of today.",
      weatherSummary: "Chicago, IL · 37°F · Partly cloudy · sunset 19:18",
      markdownPath: "",
      streakCount: 12,
    },
  });

  const todayTasks: Array<{
    text: string;
    urgency: string;
    completed: boolean;
    rolled?: number;
    goalIndex: number;
  }> = [
    { text: "Finish v1 PR description and push", urgency: "URGENT", completed: true, goalIndex: 0 },
    { text: "Review handoff feedback from design pass", urgency: "URGENT", completed: false, goalIndex: 0 },
    { text: "Wire Supabase DATABASE_URL on Vercel", urgency: "HIGH", completed: false, goalIndex: 0 },
    { text: "30-minute zone-2 cardio", urgency: "HIGH", completed: true, goalIndex: 1 },
    { text: "Pull-up + push-up superset (3 rounds)", urgency: "MEDIUM", completed: true, goalIndex: 1 },
    { text: "Re-read indexing chapter", urgency: "MEDIUM", completed: false, rolled: 2, goalIndex: 2 },
    { text: "Practice 5 join-query exercises", urgency: "MEDIUM", completed: false, goalIndex: 2 },
    { text: "Email Prof. Chen about office hours", urgency: "LOW", completed: false, rolled: 4, goalIndex: 2 },
  ];

  for (let i = 0; i < todayTasks.length; i++) {
    const t = todayTasks[i];
    await prisma.task.create({
      data: {
        dailyPlanId: todayPlan.id,
        weeklyGoalId: goals[t.goalIndex]?.id,
        text: t.text,
        urgency: t.urgency,
        completed: t.completed,
        rolledOver: !!t.rolled,
        rolledDays: t.rolled ?? 0,
        order: i,
      },
    });
  }

  const lastWeekStart = subDays(weekStart, 7);
  await prisma.weeklyReflection.create({
    data: {
      weekStart: lastWeekStart,
      tasksCompleted: 28,
      tasksTotal: 41,
      summary:
        "Solid mid-week run on the planner project — three deep-work blocks held without interruption, and the design handoff landed on Wednesday. Workouts slipped on Friday because of the late code review. Database midterm prep was the weakest area: only one real study session. For next week, protect a 90-minute study block on Tue and Thu, and schedule the workout before the standup on Friday so it doesn't get crowded out.",
      goalsBreakdown: JSON.stringify([
        { goalId: 1, goalText: "Ship the day-planner redesign", tasksCompleted: 12, tasksTotal: 14 },
        { goalId: 2, goalText: "Cardio + strength 4x this week", tasksCompleted: 6, tasksTotal: 10 },
        { goalId: 3, goalText: "Database midterm prep", tasksCompleted: 4, tasksTotal: 12 },
        { goalId: 4, goalText: "Daily reading habit", tasksCompleted: 6, tasksTotal: 5 },
      ]),
      carryForward: JSON.stringify([
        "Practice 5 join-query exercises",
        "Email Prof. Chen about office hours",
        "Schedule informational coffee chats for next month",
      ]),
    },
  });

  console.log("Seed complete.");
}

function sampleTaskText(i: number): string {
  const templates = [
    "Draft the v1 PR description",
    "Review handoff design notes",
    "Push redesign branch to GitHub",
    "30-minute zone-2 cardio",
    "Pull-up superset (3 rounds)",
    "Read indexing chapter section 4",
    "Practice 3 join-query exercises",
    "Reply to teammate code review",
    "Stretching + mobility (15 min)",
    "Sketch midterm outline",
  ];
  return templates[i % templates.length];
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
