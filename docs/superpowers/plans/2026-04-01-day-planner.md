# Day Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a proactive, voice-integrated daily planning app that auto-generates plans, texts them via iMessage, and reads them aloud through Siri.

**Architecture:** Next.js 15 App Router with server components for pages and API routes for mutations/voice. SQLite via Prisma for persistence. OpenAI GPT-5.4 for plan generation and goal setup. node-cron for scheduled proactive notifications via AppleScript iMessage and Resend email.

**Tech Stack:** Next.js 15, Tailwind CSS, Prisma + SQLite, OpenAI SDK, node-cron, WeatherAPI.com, Resend, AppleScript

**Spec:** `docs/superpowers/specs/2026-04-01-day-planner-design.md`

---

## File Structure

```
day-planner/
├── prisma/
│   ├── schema.prisma          # All models: Settings, WeeklyGoal, DailyPlan, Task, RecurringEvent, GoalSession, WeeklyReflection, QuoteLog
│   └── seed.ts                # Creates singleton Settings row with defaults
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout: dark theme, monospace font, global styles
│   │   ├── page.tsx           # Today page: server component, fetches plan + tasks + weather + streak
│   │   ├── week/
│   │   │   └── page.tsx       # Weekly goals page: goal list + smart question flow
│   │   ├── history/
│   │   │   ├── page.tsx       # History list: all past days with completion %
│   │   │   └── [date]/
│   │   │       └── page.tsx   # Single day detail: read-only view
│   │   ├── settings/
│   │   │   └── page.tsx       # Settings form + recurring events manager
│   │   ├── review/
│   │   │   └── page.tsx       # Weekly reflection scorecard
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts   # POST: generate daily plan (cron + manual)
│   │       ├── today/
│   │       │   └── voice/
│   │       │       └── route.ts  # GET: plain text TTS summary
│   │       ├── tasks/
│   │       │   ├── route.ts      # POST: add ad-hoc task
│   │       │   ├── [id]/
│   │       │   │   └── route.ts  # PATCH: toggle, PUT: edit, DELETE: drop
│   │       │   └── reorder/
│   │       │       └── route.ts  # PATCH: reorder tasks
│   │       ├── goals/
│   │       │   ├── setup/
│   │       │   │   └── route.ts  # POST: start goal question flow
│   │       │   ├── answer/
│   │       │   │   └── route.ts  # POST: submit answer, get next question
│   │       │   └── confirm/
│   │       │       └── route.ts  # POST: accept/shuffle/edit goals
│   │       ├── reflect/
│   │       │   └── route.ts      # GET + POST: weekly reflection
│   │       ├── weather/
│   │       │   └── route.ts      # GET: Chicago weather
│   │       ├── streak/
│   │       │   └── route.ts      # GET: current streak
│   │       ├── settings/
│   │       │   └── route.ts      # GET + PUT: settings CRUD
│   │       └── recurring/
│   │           └── route.ts      # GET + POST + PUT + DELETE: recurring events
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── openai.ts             # OpenAI client singleton
│   │   ├── weather.ts            # fetchWeather(): returns temp + condition for Chicago
│   │   ├── notifications.ts      # sendIMessage(), sendEmail(), notify()
│   │   ├── markdown.ts           # exportDayMarkdown(): generates and writes .md file
│   │   ├── quotes.ts             # pickQuote(): selects from pool, respects 30-day rule
│   │   ├── streak.ts             # calculateStreak(): counts consecutive complete days
│   │   ├── cron.ts               # initCron(): sets up all scheduled jobs
│   │   └── generate-plan.ts      # generateDailyPlan(): orchestrates full plan generation
│   ├── components/
│   │   ├── TaskItem.tsx           # Single task row: checkbox, text, urgency badge, rolled label
│   │   ├── TaskList.tsx           # Task list with add button, wraps TaskItems
│   │   ├── ProgressBar.tsx        # Thin progress bar with percentage
│   │   ├── QuoteBlock.tsx         # Left-bordered quote display
│   │   ├── WeatherBadge.tsx       # Top-right weather display
│   │   ├── StreakCounter.tsx      # Streak fire counter
│   │   ├── ScheduleBlock.tsx      # Recurring events display
│   │   ├── GoalSetupFlow.tsx      # Multi-step question flow for goal setup
│   │   ├── SettingsForm.tsx       # Settings form fields
│   │   ├── RecurringManager.tsx   # Recurring events add/edit/delete/toggle
│   │   ├── ReflectionCard.tsx     # Weekly reflection scorecard display
│   │   └── FirstRunBanner.tsx     # Banner directing to /settings on first run
│   └── data/
│       └── quotes.json            # 200+ curated quotes with theme tags
├── days/                          # Generated .md files (auto-created)
├── __tests__/
│   ├── lib/
│   │   ├── weather.test.ts
│   │   ├── notifications.test.ts
│   │   ├── markdown.test.ts
│   │   ├── quotes.test.ts
│   │   ├── streak.test.ts
│   │   └── generate-plan.test.ts
│   └── api/
│       ├── generate.test.ts
│       ├── tasks.test.ts
│       ├── goals.test.ts
│       ├── reflect.test.ts
│       ├── settings.test.ts
│       └── recurring.test.ts
├── .env.example
├── .gitignore
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── jest.config.ts
└── package.json
```

---

## Task 1: Project Scaffolding & Database

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`, `.gitignore`
- Create: `prisma/schema.prisma`, `prisma/seed.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (placeholder)

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/erebos/Desktop/day-planner
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js scaffold.

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client openai node-cron resend date-fns
npm install -D @types/node-cron jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `.env.example`**

```env
OPENAI_API_KEY=sk-...
WEATHER_API_KEY=...
RESEND_API_KEY=re_...
```

- [ ] **Step 4: Update `.gitignore`**

Append to the existing `.gitignore`:

```
.env.local
days/
.superpowers/
prisma/dev.db
prisma/dev.db-journal
```

- [ ] **Step 5: Initialize Prisma with SQLite**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 6: Write Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Settings {
  id            Int    @id @default(1)
  iMessagePhone String @default("")
  emailAddress  String @default("")
  morningTime   String @default("06:30")
  middayTime    String @default("12:30")
  eveningTime   String @default("20:30")
  timezone      String @default("America/Chicago")
  macLocalIp    String @default("")
}

model WeeklyGoal {
  id            Int      @id @default(autoincrement())
  goalSessionId Int
  text          String
  priority      String   @default("MEDIUM") // URGENT, HIGH, MEDIUM, LOW
  weekStart     DateTime
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  goalSession   GoalSession @relation(fields: [goalSessionId], references: [id])
  tasks         Task[]
}

model DailyPlan {
  id             Int      @id @default(autoincrement())
  date           DateTime @unique
  quote          String
  weatherSummary String
  markdownPath   String
  streakCount    Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  tasks          Task[]
}

model Task {
  id           Int      @id @default(autoincrement())
  dailyPlanId  Int
  weeklyGoalId Int?
  text         String
  urgency      String   @default("MEDIUM") // URGENT, HIGH, MEDIUM, LOW
  completed    Boolean  @default(false)
  rolledOver   Boolean  @default(false)
  rolledDays   Int      @default(0)
  order        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  dailyPlan    DailyPlan  @relation(fields: [dailyPlanId], references: [id], onDelete: Cascade)
  weeklyGoal   WeeklyGoal? @relation(fields: [weeklyGoalId], references: [id])
}

model RecurringEvent {
  id         Int      @id @default(autoincrement())
  title      String
  daysOfWeek String   // Comma-separated: "1,3,5" for MWF
  startTime  String   // "09:00"
  endTime    String   // "10:30"
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model GoalSession {
  id           Int      @id @default(autoincrement())
  initialInput String
  questions    String   @default("[]") // JSON array of {question, options, answer}
  status       String   @default("IN_PROGRESS") // IN_PROGRESS, COMPLETED
  createdAt    DateTime @default(now())
  weeklyGoals  WeeklyGoal[]
}

model WeeklyReflection {
  id             Int      @id @default(autoincrement())
  weekStart      DateTime @unique
  tasksCompleted Int
  tasksTotal     Int
  goalsBreakdown String   @default("[]") // JSON
  carryForward   String   @default("[]") // JSON
  summary        String
  createdAt      DateTime @default(now())
}

model QuoteLog {
  id        Int      @id @default(autoincrement())
  quoteText String
  usedOn    DateTime
}
```

- [ ] **Step 7: Create Prisma seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      iMessagePhone: "",
      emailAddress: "",
      morningTime: "06:30",
      middayTime: "12:30",
      eveningTime: "20:30",
      timezone: "America/Chicago",
      macLocalIp: "",
    },
  });
  console.log("Seeded default settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 8: Run Prisma migration and seed**

```bash
npx prisma db push
npm install -D tsx
npx prisma db seed
```

Expected: "Seeded default settings"

- [ ] **Step 9: Create Prisma client singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 10: Create OpenAI client singleton**

Create `src/lib/openai.ts`:

```typescript
import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openai: OpenAI };

export const openai =
  globalForOpenAI.openai ||
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;
```

- [ ] **Step 11: Set up root layout with dark theme**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Day Planner",
  description: "Proactive daily planning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${mono.variable} font-mono bg-[#0a0a0a] text-gray-200 min-h-screen`}
      >
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 12: Update globals.css for dark theme**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

body {
  background: #0a0a0a;
  color: #e0e0e0;
}

::selection {
  background: #333;
  color: #fff;
}
```

- [ ] **Step 13: Create placeholder home page**

Replace `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl text-gray-400">Day Planner</h1>
      <p className="text-gray-600 mt-2">Setting up...</p>
    </div>
  );
}
```

- [ ] **Step 14: Configure Next.js for 0.0.0.0 binding**

Create `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron"],
};

export default nextConfig;
```

Add to `package.json` scripts:

```json
"dev": "next dev --hostname 0.0.0.0"
```

- [ ] **Step 15: Verify the app runs**

```bash
npm run dev
```

Expected: App starts at `http://0.0.0.0:3000`, shows "Day Planner / Setting up..."

- [ ] **Step 16: Set up Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
```

Add to `package.json` scripts:

```json
"test": "jest"
```

- [ ] **Step 17: Initialize git and commit**

```bash
cd /Users/erebos/Desktop/day-planner
git init
git add -A
git commit -m "feat: project scaffolding — Next.js 15, Tailwind, Prisma, SQLite schema with all models"
```

---

## Task 2: Quote System

**Files:**
- Create: `src/data/quotes.json`
- Create: `src/lib/quotes.ts`
- Create: `__tests__/lib/quotes.test.ts`

- [ ] **Step 1: Create quotes data file**

Create `src/data/quotes.json` with 200+ curated quotes. Each quote:

```json
[
  {
    "text": "The best time to plant a tree was 20 years ago. The second best time is now.",
    "theme": "entrepreneurship"
  },
  {
    "text": "Stop thinking about what could go wrong and start thinking about what could go right.",
    "theme": "discipline"
  },
  {
    "text": "Your work is going to fill a large part of your life. The only way to be truly satisfied is to do what you believe is great work.",
    "theme": "grind"
  }
]
```

Include 200+ quotes across themes: `entrepreneurship`, `discipline`, `focus`, `grind`. No quotes about relationships or women.

- [ ] **Step 2: Write failing test for pickQuote**

Create `__tests__/lib/quotes.test.ts`:

```typescript
import { pickQuote } from "@/lib/quotes";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    quoteLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

describe("pickQuote", () => {
  it("returns a quote string", async () => {
    const quote = await pickQuote();
    expect(typeof quote).toBe("string");
    expect(quote.length).toBeGreaterThan(0);
  });

  it("excludes recently used quotes", async () => {
    const { prisma } = require("@/lib/prisma");
    (prisma.quoteLog.findMany as jest.Mock).mockResolvedValueOnce([
      { quoteText: "The best time to plant a tree was 20 years ago. The second best time is now." },
    ]);

    const quote = await pickQuote();
    expect(quote).not.toBe(
      "The best time to plant a tree was 20 years ago. The second best time is now."
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- __tests__/lib/quotes.test.ts
```

Expected: FAIL — Cannot find module `@/lib/quotes`

- [ ] **Step 4: Implement pickQuote**

Create `src/lib/quotes.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import quotesData from "@/data/quotes.json";

export async function pickQuote(): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentlyUsed = await prisma.quoteLog.findMany({
    where: { usedOn: { gte: thirtyDaysAgo } },
    select: { quoteText: true },
  });

  const usedTexts = new Set(recentlyUsed.map((q) => q.quoteText));
  const available = quotesData.filter((q) => !usedTexts.has(q.text));

  const pool = available.length > 0 ? available : quotesData;
  const selected = pool[Math.floor(Math.random() * pool.length)];

  await prisma.quoteLog.create({
    data: { quoteText: selected.text, usedOn: new Date() },
  });

  return selected.text;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- __tests__/lib/quotes.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/quotes.json src/lib/quotes.ts __tests__/lib/quotes.test.ts
git commit -m "feat: quote system with 30-day no-repeat rule"
```

---

## Task 3: Weather Service

**Files:**
- Create: `src/lib/weather.ts`
- Create: `__tests__/lib/weather.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/weather.test.ts`:

```typescript
import { fetchWeather } from "@/lib/weather";

// Mock global fetch
global.fetch = jest.fn();

describe("fetchWeather", () => {
  it("returns formatted weather string on success", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: {
          temp_f: 48,
          condition: { text: "Partly Cloudy" },
          feelslike_f: 44,
        },
      }),
    });

    const result = await fetchWeather();
    expect(result).toBe("48°F, Partly Cloudy");
  });

  it("returns fallback on API failure", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    const result = await fetchWeather();
    expect(result).toBe("Weather unavailable");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/weather.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement fetchWeather**

Create `src/lib/weather.ts`:

```typescript
export async function fetchWeather(): Promise<string> {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=Chicago&aqi=no`
    );

    if (!res.ok) return "Weather unavailable";

    const data = await res.json();
    const { temp_f, condition } = data.current;
    return `${Math.round(temp_f)}°F, ${condition.text}`;
  } catch {
    return "Weather unavailable";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/weather.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather.ts __tests__/lib/weather.test.ts
git commit -m "feat: weather service for Chicago via WeatherAPI.com"
```

---

## Task 4: Notification Service (iMessage + Email)

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `__tests__/lib/notifications.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/notifications.test.ts`:

```typescript
import { sendIMessage, sendEmail, notify } from "@/lib/notifications";
import { exec } from "child_process";

jest.mock("child_process", () => ({
  exec: jest.fn((_cmd: string, cb: (err: Error | null) => void) => cb(null)),
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: "test-id" }),
    },
  })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    settings: {
      findUnique: jest.fn().mockResolvedValue({
        iMessagePhone: "+11234567890",
        emailAddress: "test@example.com",
      }),
    },
  },
}));

describe("sendIMessage", () => {
  it("calls osascript with correct AppleScript", async () => {
    await sendIMessage("+11234567890", "Hello");
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('tell application "Messages"'),
      expect.any(Function)
    );
  });
});

describe("notify", () => {
  it("sends iMessage and email", async () => {
    const result = await notify("Test message");
    expect(result.attempted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/notifications.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement notification service**

Create `src/lib/notifications.ts`:

```typescript
import { exec } from "child_process";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export function sendIMessage(
  phone: string,
  message: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const escaped = message.replace(/"/g, '\\"');
    const script = `osascript -e 'tell application "Messages" to send "${escaped}" to buddy "${phone}" of (1st account whose service type = iMessage)'`;

    exec(script, (err) => {
      if (err) {
        console.error("iMessage failed:", err.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Day Planner <onboarding@resend.dev>",
      to,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error("Email failed:", err);
    return false;
  }
}

export async function notify(
  message: string,
  subject = "Day Planner"
): Promise<{ attempted: boolean; iMessage: boolean; email: boolean }> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings?.iMessagePhone && !settings?.emailAddress) {
    return { attempted: false, iMessage: false, email: false };
  }

  let iMessageSent = false;
  let emailSent = false;

  if (settings.iMessagePhone) {
    iMessageSent = await sendIMessage(settings.iMessagePhone, message);
  }

  // Email is a fallback — only send if iMessage was not configured or failed
  if (settings.emailAddress && !iMessageSent) {
    emailSent = await sendEmail(settings.emailAddress, subject, message);
  }

  return { attempted: true, iMessage: iMessageSent, email: emailSent };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/notifications.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts __tests__/lib/notifications.test.ts
git commit -m "feat: notification service — iMessage via AppleScript + Resend email fallback"
```

---

## Task 5: Streak Calculator

**Files:**
- Create: `src/lib/streak.ts`
- Create: `__tests__/lib/streak.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/streak.test.ts`:

```typescript
import { calculateStreak } from "@/lib/streak";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    dailyPlan: {
      findMany: jest.fn(),
    },
    task: {
      groupBy: jest.fn(),
    },
  },
}));

describe("calculateStreak", () => {
  const { prisma } = require("@/lib/prisma");

  it("returns 0 when no plans exist", async () => {
    (prisma.dailyPlan.findMany as jest.Mock).mockResolvedValue([]);
    expect(await calculateStreak()).toBe(0);
  });

  it("counts consecutive complete days", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    (prisma.dailyPlan.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2,
        date: today,
        tasks: [{ completed: true }, { completed: true }],
      },
      {
        id: 1,
        date: yesterday,
        tasks: [{ completed: true }],
      },
    ]);

    expect(await calculateStreak()).toBe(2);
  });

  it("stops counting at first incomplete day", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    (prisma.dailyPlan.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2,
        date: today,
        tasks: [{ completed: true }],
      },
      {
        id: 1,
        date: yesterday,
        tasks: [{ completed: true }, { completed: false }],
      },
    ]);

    expect(await calculateStreak()).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/streak.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement calculateStreak**

Create `src/lib/streak.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function calculateStreak(): Promise<number> {
  const plans = await prisma.dailyPlan.findMany({
    orderBy: { date: "desc" },
    include: { tasks: { select: { completed: true } } },
    take: 365,
  });

  let streak = 0;

  for (const plan of plans) {
    if (plan.tasks.length === 0) continue;
    const allDone = plan.tasks.every((t) => t.completed);
    if (allDone) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/streak.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/streak.ts __tests__/lib/streak.test.ts
git commit -m "feat: streak calculator — consecutive complete days"
```

---

## Task 6: Markdown Export

**Files:**
- Create: `src/lib/markdown.ts`
- Create: `__tests__/lib/markdown.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/markdown.test.ts`:

```typescript
import { generateMarkdown } from "@/lib/markdown";

describe("generateMarkdown", () => {
  it("generates correct markdown format", () => {
    const md = generateMarkdown({
      date: new Date("2026-04-01"),
      weather: "48°F, Partly Cloudy",
      quote: "Work hard, stay humble.",
      schedule: [
        { title: "CS 101 Lecture", startTime: "09:00", endTime: "10:30" },
      ],
      tasks: [
        { text: "Ship MVP", urgency: "URGENT", completed: true, rolledOver: false },
        { text: "Review PR", urgency: "HIGH", completed: false, rolledOver: true },
      ],
    });

    expect(md).toContain("# Wednesday, April 1, 2026");
    expect(md).toContain("Chicago — 48°F, Partly Cloudy");
    expect(md).toContain("Work hard, stay humble.");
    expect(md).toContain("- [x] Ship MVP `URGENT`");
    expect(md).toContain("- [ ] Review PR `HIGH` *(rolled from yesterday)*");
    expect(md).toContain("09:00–10:30 CS 101 Lecture (recurring)");
    expect(md).toContain("1/2 (50%)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/markdown.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement markdown generation and export**

Create `src/lib/markdown.ts`:

```typescript
import { writeFileSync, mkdirSync } from "fs";
import { format } from "date-fns";
import path from "path";

interface MarkdownTask {
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
}

interface ScheduleItem {
  title: string;
  startTime: string;
  endTime: string;
}

interface MarkdownData {
  date: Date;
  weather: string;
  quote: string;
  schedule: ScheduleItem[];
  tasks: MarkdownTask[];
}

export function generateMarkdown(data: MarkdownData): string {
  const { date, weather, quote, schedule, tasks } = data;

  const dateStr = format(date, "EEEE, MMMM d, yyyy");
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const filledBlocks = Math.round((completed / total) * 16) || 0;
  const progressBar =
    "\u2588".repeat(filledBlocks) + "\u2591".repeat(16 - filledBlocks);

  let md = `# ${dateStr}\n`;
  md += `> Chicago — ${weather}\n\n`;
  md += `> "${quote}"\n\n`;

  if (schedule.length > 0) {
    md += `## Schedule\n`;
    for (const s of schedule) {
      md += `- ${s.startTime}\u2013${s.endTime} ${s.title} (recurring)\n`;
    }
    md += `\n`;
  }

  md += `## Tasks\n`;
  for (const t of tasks) {
    const check = t.completed ? "x" : " ";
    const rolled = t.rolledOver ? " *(rolled from yesterday)*" : "";
    md += `- [${check}] ${t.text} \`${t.urgency}\`${rolled}\n`;
  }

  md += `\n## Progress\n`;
  md += `${progressBar} ${completed}/${total} (${pct}%)\n`;

  return md;
}

export function exportDayMarkdown(
  data: MarkdownData,
  projectRoot: string = process.cwd()
): string {
  const dateStr = format(data.date, "yyyy-MM-dd");
  const dir = path.join(projectRoot, "days");
  mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${dateStr}.md`);
  const content = generateMarkdown(data);
  writeFileSync(filePath, content, "utf-8");

  return filePath;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/markdown.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/markdown.ts __tests__/lib/markdown.test.ts
git commit -m "feat: markdown export — generates and writes daily .md files"
```

---

## Task 7: Plan Generation Service

**Files:**
- Create: `src/lib/generate-plan.ts`
- Create: `__tests__/lib/generate-plan.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/generate-plan.test.ts`:

```typescript
import { generateDailyPlan } from "@/lib/generate-plan";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    settings: { findUnique: jest.fn().mockResolvedValue({ timezone: "America/Chicago" }) },
    weeklyGoal: { findMany: jest.fn().mockResolvedValue([{ id: 1, text: "Ship MVP", priority: "URGENT" }]) },
    recurringEvent: { findMany: jest.fn().mockResolvedValue([]) },
    dailyPlan: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((fn: Function) => fn({
      dailyPlan: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 1 }), delete: jest.fn() },
      task: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
    })),
  },
}));

jest.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                tasks: [
                  { text: "Build landing page", urgency: "URGENT", weeklyGoalId: 1 },
                  { text: "Write tests", urgency: "MEDIUM", weeklyGoalId: null },
                ],
              }),
            },
          }],
        }),
      },
    },
  },
}));

jest.mock("@/lib/weather", () => ({ fetchWeather: jest.fn().mockResolvedValue("48°F, Cloudy") }));
jest.mock("@/lib/quotes", () => ({ pickQuote: jest.fn().mockResolvedValue("Work hard.") }));
jest.mock("@/lib/streak", () => ({ calculateStreak: jest.fn().mockResolvedValue(3) }));
jest.mock("@/lib/markdown", () => ({ exportDayMarkdown: jest.fn().mockReturnValue("/days/2026-04-01.md") }));
jest.mock("@/lib/notifications", () => ({ notify: jest.fn().mockResolvedValue({ attempted: true }) }));

describe("generateDailyPlan", () => {
  it("orchestrates plan generation and returns plan data", async () => {
    const result = await generateDailyPlan();
    expect(result).toHaveProperty("quote", "Work hard.");
    expect(result).toHaveProperty("weather", "48°F, Cloudy");
    expect(result).toHaveProperty("tasks");
    expect(result.tasks).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/generate-plan.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement generateDailyPlan**

Create `src/lib/generate-plan.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { fetchWeather } from "@/lib/weather";
import { pickQuote } from "@/lib/quotes";
import { calculateStreak } from "@/lib/streak";
import { exportDayMarkdown } from "@/lib/markdown";
import { notify } from "@/lib/notifications";
import { startOfDay } from "date-fns";

export async function generateDailyPlan() {
  const today = startOfDay(new Date());

  // Fetch all inputs in parallel
  const [weather, quote, streak, weeklyGoals, recurringEvents, rolledTasks] =
    await Promise.all([
      fetchWeather(),
      pickQuote(),
      calculateStreak(),
      prisma.weeklyGoal.findMany({ where: { active: true } }),
      prisma.recurringEvent.findMany({ where: { active: true } }),
      prisma.task.findMany({
        where: {
          completed: false,
          dailyPlan: {
            date: { lt: today },
          },
        },
        orderBy: { rolledDays: "desc" },
      }),
    ]);

  // Filter recurring events for today
  const dayOfWeek = today.getDay();
  const todaysEvents = recurringEvents.filter((e) =>
    e.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
  );

  // Build prompt for OpenAI
  const goalsText = weeklyGoals
    .map((g) => `- [${g.priority}] ${g.text} (id: ${g.id})`)
    .join("\n");

  const rolledText =
    rolledTasks.length > 0
      ? rolledTasks
          .map(
            (t) =>
              `- "${t.text}" (urgency: ${t.urgency}, rolled ${t.rolledDays} days)`
          )
          .join("\n")
      : "None";

  const scheduleText =
    todaysEvents.length > 0
      ? todaysEvents
          .map((e) => `- ${e.startTime}-${e.endTime}: ${e.title}`)
          .join("\n")
      : "No recurring events today";

  const prompt = `You are a proactive daily planner. Generate today's tasks based on the user's weekly goals, carried-over tasks, and schedule.

Weekly Goals:
${goalsText || "No weekly goals set"}

Carried-over tasks (incomplete from previous days):
${rolledText}

Today's fixed schedule:
${scheduleText}

Rules:
- Generate 3-7 tasks total (including carried-over tasks)
- Carried-over tasks should be included with bumped urgency
- If a task has rolled 3+ days, flag it explicitly
- Assign urgency: URGENT, HIGH, MEDIUM, or LOW
- Each task should link to a weeklyGoalId if applicable (null if ad-hoc)
- Schedule tasks around fixed events
- Be specific and actionable

Respond with ONLY valid JSON:
{
  "tasks": [
    { "text": "task description", "urgency": "URGENT|HIGH|MEDIUM|LOW", "weeklyGoalId": number|null }
  ]
}`;

  // Retry with exponential backoff (up to 3 attempts)
  let completion;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      break;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  const generated = JSON.parse(
    completion!.choices[0].message.content || '{"tasks":[]}'
  );

  // Delete existing plan for today if regenerating
  const existingPlan = await prisma.dailyPlan.findUnique({
    where: { date: today },
  });
  if (existingPlan) {
    await prisma.dailyPlan.delete({ where: { id: existingPlan.id } });
  }

  // Create plan
  const plan = await prisma.dailyPlan.create({
    data: {
      date: today,
      quote,
      weatherSummary: weather,
      markdownPath: "",
      streakCount: streak,
    },
  });

  // Create tasks
  const tasks = generated.tasks.map(
    (
      t: { text: string; urgency: string; weeklyGoalId: number | null },
      i: number
    ) => {
      const rolledTask = rolledTasks.find((rt) => rt.text === t.text);
      return {
        dailyPlanId: plan.id,
        text: t.text,
        urgency: t.urgency,
        weeklyGoalId: t.weeklyGoalId,
        completed: false,
        rolledOver: !!rolledTask,
        rolledDays: rolledTask ? rolledTask.rolledDays + 1 : 0,
        order: i,
      };
    }
  );

  await prisma.task.createMany({ data: tasks });

  // Export markdown
  const schedule = todaysEvents.map((e) => ({
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
  }));

  const mdPath = exportDayMarkdown({
    date: today,
    weather,
    quote,
    schedule,
    tasks: tasks.map((t: { text: string; urgency: string; completed: boolean; rolledOver: boolean }) => ({
      text: t.text,
      urgency: t.urgency,
      completed: t.completed,
      rolledOver: t.rolledOver,
    })),
  });

  // Update plan with markdown path
  await prisma.dailyPlan.update({
    where: { id: plan.id },
    data: { markdownPath: mdPath },
  });

  // Send notification
  const taskSummary = tasks
    .map((t: { text: string; urgency: string }) => `• [${t.urgency}] ${t.text}`)
    .join("\n");

  const message = `Good morning! Here's your plan for today:\n\n"${quote}"\n\n${taskSummary}\n\nWeather: Chicago ${weather}\nStreak: ${streak} days\n\nOpen: http://localhost:3000`;

  await notify(message, "Your Day Plan");

  return {
    planId: plan.id,
    quote,
    weather,
    streak,
    tasks: generated.tasks,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/generate-plan.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/generate-plan.ts __tests__/lib/generate-plan.test.ts
git commit -m "feat: plan generation — orchestrates OpenAI, weather, quotes, markdown, notifications"
```

---

## Task 8: API Routes — Generate, Tasks, Voice

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`
- Create: `src/app/api/tasks/reorder/route.ts`
- Create: `src/app/api/today/voice/route.ts`

- [ ] **Step 1: Create POST /api/generate**

Create `src/app/api/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { generateDailyPlan } from "@/lib/generate-plan";

export async function POST() {
  try {
    const result = await generateDailyPlan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Plan generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create POST /api/tasks (add ad-hoc task)**

Create `src/app/api/tasks/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const { text, urgency = "MEDIUM" } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const plan = await prisma.dailyPlan.findUnique({ where: { date: today } });

  if (!plan) {
    return NextResponse.json(
      { error: "No plan for today. Generate one first." },
      { status: 404 }
    );
  }

  const maxOrder = await prisma.task.aggregate({
    where: { dailyPlanId: plan.id },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      dailyPlanId: plan.id,
      text,
      urgency,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
```

- [ ] **Step 3: Create PATCH/PUT/DELETE /api/tasks/[id]**

Create `src/app/api/tasks/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportDayMarkdown } from "@/lib/markdown";

async function reExportMarkdown(dailyPlanId: number) {
  const plan = await prisma.dailyPlan.findUnique({
    where: { id: dailyPlanId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  if (!plan) return;

  const events = await prisma.recurringEvent.findMany({
    where: { active: true },
  });
  const dayOfWeek = plan.date.getDay();
  const todaysEvents = events.filter((e) =>
    e.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
  );

  exportDayMarkdown({
    date: plan.date,
    weather: plan.weatherSummary,
    quote: plan.quote,
    schedule: todaysEvents.map((e) => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
    tasks: plan.tasks.map((t) => ({
      text: t.text,
      urgency: t.urgency,
      completed: t.completed,
      rolledOver: t.rolledOver,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id: Number(id) },
    data: { completed: !task.completed },
  });

  await reExportMarkdown(task.dailyPlanId);

  return NextResponse.json(updated);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { text, urgency } = await req.json();

  const updated = await prisma.task.update({
    where: { id: Number(id) },
    data: {
      ...(text !== undefined && { text }),
      ...(urgency !== undefined && { urgency }),
    },
  });

  await reExportMarkdown(updated.dailyPlanId);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id: Number(id) } });
  await reExportMarkdown(task.dailyPlanId);

  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 4: Create PATCH /api/tasks/reorder**

Create `src/app/api/tasks/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { tasks } = await req.json(); // [{ id: number, order: number }]

  await Promise.all(
    tasks.map((t: { id: number; order: number }) =>
      prisma.task.update({ where: { id: t.id }, data: { order: t.order } })
    )
  );

  return NextResponse.json({ reordered: true });
}
```

- [ ] **Step 5: Create GET /api/today/voice**

Create `src/app/api/today/voice/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, format } from "date-fns";

export async function GET() {
  const today = startOfDay(new Date());
  const plan = await prisma.dailyPlan.findUnique({
    where: { date: today },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!plan) {
    return new NextResponse("No plan generated for today yet.", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const dateStr = format(today, "EEEE, MMMM do");
  const urgent = plan.tasks.filter((t) => t.urgency === "URGENT" && !t.completed);
  const high = plan.tasks.filter((t) => t.urgency === "HIGH" && !t.completed);
  const remaining = plan.tasks.filter((t) => !t.completed);

  let speech = `Good morning. It's ${dateStr}. ${plan.weatherSummary} in Chicago.\n\n`;
  speech += `Your quote for today: ${plan.quote}\n\n`;
  speech += `You have ${remaining.length} tasks today. `;

  if (urgent.length > 0) {
    speech += `Your urgent ${urgent.length === 1 ? "task is" : "tasks are"}: ${urgent.map((t) => t.text).join(" and ")}. `;
  }
  if (high.length > 0) {
    speech += `High priority: ${high.map((t) => t.text).join(" and ")}. `;
  }

  speech += `\n\nYou're on a ${plan.streakCount} day streak. Let's keep it going.`;

  return new NextResponse(speech, {
    headers: { "Content-Type": "text/plain" },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat: API routes — generate, tasks CRUD, voice TTS endpoint"
```

---

## Task 9: API Routes — Goals, Reflect, Weather, Streak, Settings, Recurring

**Files:**
- Create: `src/app/api/goals/setup/route.ts`
- Create: `src/app/api/goals/answer/route.ts`
- Create: `src/app/api/goals/confirm/route.ts`
- Create: `src/app/api/reflect/route.ts`
- Create: `src/app/api/weather/route.ts`
- Create: `src/app/api/streak/route.ts`
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/recurring/route.ts`

- [ ] **Step 1: Create POST /api/goals/setup**

Create `src/app/api/goals/setup/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  const contentType = req.headers.get("accept");
  const isVoice = contentType === "text/plain";

  // Check for existing goals to provide context
  const existingGoals = await prisma.weeklyGoal.findMany({
    where: { active: true },
    select: { text: true, priority: true },
  });

  const existingContext =
    existingGoals.length > 0
      ? `Previous goals: ${existingGoals.map((g) => g.text).join(", ")}`
      : "No previous goals";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "system",
        content: `You are a weekly goal-setting assistant. The user gives brief input about their focus. Generate the FIRST of 5-6 multiple-choice questions to understand their goals better. Each question should have 5-6 numbered options plus "Other".

${existingContext}

Respond with ONLY valid JSON:
{
  "question": "What's your main focus this week?",
  "options": ["Getting new users", "Building features", "Revenue/monetization", "Content/marketing", "Operations/admin", "Other (type your own)"]
}`,
      },
      { role: "user", content: input },
    ],
    response_format: { type: "json_object" },
  });

  const firstQuestion = JSON.parse(
    completion.choices[0].message.content || "{}"
  );

  const session = await prisma.goalSession.create({
    data: {
      initialInput: input,
      questions: JSON.stringify([
        { question: firstQuestion.question, options: firstQuestion.options, answer: null },
      ]),
      status: "IN_PROGRESS",
    },
  });

  if (isVoice) {
    const optionsText = firstQuestion.options
      .map((o: string, i: number) => `${i + 1}: ${o}`)
      .join(". ");
    return new NextResponse(
      `${firstQuestion.question}\n${optionsText}`,
      { headers: { "Content-Type": "text/plain" } }
    );
  }

  return NextResponse.json({ sessionId: session.id, ...firstQuestion });
}
```

- [ ] **Step 2: Create POST /api/goals/answer**

Create `src/app/api/goals/answer/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const { sessionId, answer } = await req.json();
  const contentType = req.headers.get("accept");
  const isVoice = contentType === "text/plain";

  const session = await prisma.goalSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== "IN_PROGRESS") {
    const msg = "Session not found or already completed";
    return isVoice
      ? new NextResponse(msg, { headers: { "Content-Type": "text/plain" } })
      : NextResponse.json({ error: msg }, { status: 404 });
  }

  const questions = JSON.parse(session.questions as string);
  const currentQ = questions[questions.length - 1];
  currentQ.answer = answer;

  const answeredCount = questions.filter(
    (q: { answer: string | null }) => q.answer !== null
  ).length;

  // After 5-6 questions, generate final goals
  if (answeredCount >= 5) {
    const qaSummary = questions
      .map(
        (q: { question: string; options: string[]; answer: string }) =>
          `Q: ${q.question}\nA: ${q.options[Number(q.answer) - 1] || q.answer}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: `Based on the user's answers, generate 4-6 concrete weekly goals with priorities. Be specific and actionable.

Respond with ONLY valid JSON:
{
  "goals": [
    { "text": "goal description", "priority": "URGENT|HIGH|MEDIUM|LOW" }
  ]
}`,
        },
        {
          role: "user",
          content: `Initial input: ${session.initialInput}\n\n${qaSummary}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      completion.choices[0].message.content || '{"goals":[]}'
    );

    await prisma.goalSession.update({
      where: { id: sessionId },
      data: { questions: JSON.stringify(questions) },
    });

    if (isVoice) {
      const goalsText = result.goals
        .map(
          (g: { text: string; priority: string }, i: number) =>
            `${i + 1}: ${g.text}, priority ${g.priority}`
        )
        .join(". ");
      return new NextResponse(
        `goals: Here's your week. ${goalsText}. Say accept, shuffle, or edit.`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }

    return NextResponse.json({
      sessionId,
      done: true,
      goals: result.goals,
    });
  }

  // Generate next question
  const qaSummary = questions
    .filter((q: { answer: string | null }) => q.answer !== null)
    .map(
      (q: { question: string; options: string[]; answer: string }) =>
        `Q: ${q.question}\nA: ${q.options[Number(q.answer) - 1] || q.answer}`
    )
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "system",
        content: `You are helping the user set weekly goals. Generate question ${answeredCount + 1} of 5-6. Make it specific based on previous answers. 5-6 multiple choice options.

Respond with ONLY valid JSON:
{
  "question": "...",
  "options": ["...", "...", "...", "...", "...", "Other"]
}`,
      },
      {
        role: "user",
        content: `Initial input: ${session.initialInput}\n\nPrevious:\n${qaSummary}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const nextQ = JSON.parse(
    completion.choices[0].message.content || "{}"
  );

  questions.push({
    question: nextQ.question,
    options: nextQ.options,
    answer: null,
  });

  await prisma.goalSession.update({
    where: { id: sessionId },
    data: { questions: JSON.stringify(questions) },
  });

  if (isVoice) {
    const optionsText = nextQ.options
      .map((o: string, i: number) => `${i + 1}: ${o}`)
      .join(". ");
    return new NextResponse(`${nextQ.question}\n${optionsText}`, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ sessionId, ...nextQ, questionNumber: answeredCount + 1 });
}
```

- [ ] **Step 3: Create POST /api/goals/confirm**

Create `src/app/api/goals/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { startOfWeek, addDays } from "date-fns";

export async function POST(req: NextRequest) {
  const { sessionId, action, goals } = await req.json();
  // action: "accept" | "shuffle" | "edit"
  // goals: only provided when action is "edit" — [{text, priority}]

  const contentType = req.headers.get("accept");
  const isVoice = contentType === "text/plain";

  const session = await prisma.goalSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return isVoice
      ? new NextResponse("Session not found", { headers: { "Content-Type": "text/plain" } })
      : NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let finalGoals = goals;

  if (action === "shuffle") {
    const questions = JSON.parse(session.questions as string);
    const qaSummary = questions
      .filter((q: { answer: string | null }) => q.answer !== null)
      .map(
        (q: { question: string; options: string[]; answer: string }) =>
          `Q: ${q.question}\nA: ${q.options[Number(q.answer) - 1] || q.answer}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content:
            "Generate a DIFFERENT set of 4-6 weekly goals based on the same answers. Be creative with alternative approaches.\n\nRespond with ONLY valid JSON:\n{\"goals\": [{\"text\": \"...\", \"priority\": \"URGENT|HIGH|MEDIUM|LOW\"}]}",
        },
        {
          role: "user",
          content: `Initial input: ${session.initialInput}\n\n${qaSummary}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    finalGoals = JSON.parse(
      completion.choices[0].message.content || '{"goals":[]}'
    ).goals;

    if (isVoice) {
      const goalsText = finalGoals
        .map(
          (g: { text: string; priority: string }, i: number) =>
            `${i + 1}: ${g.text}, priority ${g.priority}`
        )
        .join(". ");
      return new NextResponse(
        `goals: Here's a different set. ${goalsText}. Say accept, shuffle, or edit.`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }

    return NextResponse.json({ sessionId, goals: finalGoals, reshuffled: true });
  }

  // action is "accept" or "edit" with provided goals
  if (action === "accept" && !finalGoals) {
    // Pull goals from last answer response — re-generate
    const questions = JSON.parse(session.questions as string);
    const qaSummary = questions
      .filter((q: { answer: string | null }) => q.answer !== null)
      .map(
        (q: { question: string; options: string[]; answer: string }) =>
          `Q: ${q.question}\nA: ${q.options[Number(q.answer) - 1] || q.answer}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content:
            "Generate 4-6 concrete weekly goals.\n\nRespond with ONLY valid JSON:\n{\"goals\": [{\"text\": \"...\", \"priority\": \"URGENT|HIGH|MEDIUM|LOW\"}]}",
        },
        {
          role: "user",
          content: `Initial input: ${session.initialInput}\n\n${qaSummary}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    finalGoals = JSON.parse(
      completion.choices[0].message.content || '{"goals":[]}'
    ).goals;
  }

  // Deactivate old goals
  await prisma.weeklyGoal.updateMany({
    where: { active: true },
    data: { active: false },
  });

  // Create new goals
  const nextMonday = startOfWeek(addDays(new Date(), 1), { weekStartsOn: 1 });

  const created = await Promise.all(
    finalGoals.map((g: { text: string; priority: string }) =>
      prisma.weeklyGoal.create({
        data: {
          goalSessionId: sessionId,
          text: g.text,
          priority: g.priority,
          weekStart: nextMonday,
          active: true,
        },
      })
    )
  );

  await prisma.goalSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });

  if (isVoice) {
    return new NextResponse(
      `Done! ${created.length} goals set for this week. You're all set.`,
      { headers: { "Content-Type": "text/plain" } }
    );
  }

  return NextResponse.json({ confirmed: true, goals: created });
}
```

- [ ] **Step 4: Create GET+POST /api/reflect**

Create `src/app/api/reflect/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week");
  const weekStart = weekParam
    ? new Date(weekParam)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const reflection = await prisma.weeklyReflection.findUnique({
    where: { weekStart },
  });

  if (!reflection) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    ...reflection,
    goalsBreakdown: JSON.parse(reflection.goalsBreakdown as string),
    carryForward: JSON.parse(reflection.carryForward as string),
  });
}

export async function POST() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const plans = await prisma.dailyPlan.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    include: { tasks: true },
  });

  const allTasks = plans.flatMap((p) => p.tasks);
  const tasksCompleted = allTasks.filter((t) => t.completed).length;
  const tasksTotal = allTasks.length;

  const goals = await prisma.weeklyGoal.findMany({
    where: { weekStart, active: true },
    include: { tasks: true },
  });

  const goalsBreakdown = goals.map((g) => ({
    goalId: g.id,
    goalText: g.text,
    tasksCompleted: g.tasks.filter((t) => t.completed).length,
    tasksTotal: g.tasks.length,
  }));

  const incompleteTasks = allTasks
    .filter((t) => !t.completed)
    .map((t) => t.text);

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "system",
        content:
          "Write a brief, encouraging weekly reflection (2-3 sentences). Be honest about what didn't get done but focus on progress.",
      },
      {
        role: "user",
        content: `Completed ${tasksCompleted}/${tasksTotal} tasks. Goals: ${JSON.stringify(goalsBreakdown)}. Incomplete: ${incompleteTasks.join(", ") || "None"}`,
      },
    ],
  });

  const summary = completion.choices[0].message.content || "";

  const reflection = await prisma.weeklyReflection.upsert({
    where: { weekStart },
    update: {
      tasksCompleted,
      tasksTotal,
      goalsBreakdown: JSON.stringify(goalsBreakdown),
      carryForward: JSON.stringify(incompleteTasks),
      summary,
    },
    create: {
      weekStart,
      tasksCompleted,
      tasksTotal,
      goalsBreakdown: JSON.stringify(goalsBreakdown),
      carryForward: JSON.stringify(incompleteTasks),
      summary,
    },
  });

  return NextResponse.json({
    ...reflection,
    goalsBreakdown,
    carryForward: incompleteTasks,
  });
}
```

- [ ] **Step 5: Create GET /api/weather**

Create `src/app/api/weather/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";

export async function GET() {
  const weather = await fetchWeather();
  return NextResponse.json({ weather });
}
```

- [ ] **Step 6: Create GET /api/streak**

Create `src/app/api/streak/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { calculateStreak } from "@/lib/streak";

export async function GET() {
  const streak = await calculateStreak();
  return NextResponse.json({ streak });
}
```

- [ ] **Step 7: Create GET+PUT /api/settings**

Create `src/app/api/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { networkInterfaces } from "os";

function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1 } });
  }

  const localIp = getLocalIp();
  if (settings.macLocalIp !== localIp) {
    settings = await prisma.settings.update({
      where: { id: 1 },
      data: { macLocalIp: localIp },
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const data = await req.json();

  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...(data.iMessagePhone !== undefined && { iMessagePhone: data.iMessagePhone }),
      ...(data.emailAddress !== undefined && { emailAddress: data.emailAddress }),
      ...(data.morningTime !== undefined && { morningTime: data.morningTime }),
      ...(data.middayTime !== undefined && { middayTime: data.middayTime }),
      ...(data.eveningTime !== undefined && { eveningTime: data.eveningTime }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
  });

  return NextResponse.json(settings);
}
```

- [ ] **Step 8: Create CRUD /api/recurring**

Create `src/app/api/recurring/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.recurringEvent.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const { title, daysOfWeek, startTime, endTime } = await req.json();

  if (!title || !daysOfWeek || !startTime || !endTime) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const event = await prisma.recurringEvent.create({
    data: { title, daysOfWeek, startTime, endTime },
  });

  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();

  const event = await prisma.recurringEvent.update({
    where: { id },
    data,
  });

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  await prisma.recurringEvent.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/
git commit -m "feat: all API routes — goals flow, reflection, weather, streak, settings, recurring"
```

---

## Task 10: UI Components

**Files:**
- Create all files in `src/components/`

- [ ] **Step 1: Create TaskItem component**

Create `src/components/TaskItem.tsx`:

```tsx
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
            <path
              fill="currentColor"
              d="M6.5 11.5L3 8l1-1 2.5 2.5L12 4l1 1z"
            />
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
        <span className="text-[10px] text-red-400">
          {rolledDays}d overdue
        </span>
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
```

- [ ] **Step 2: Create TaskList component**

Create `src/components/TaskList.tsx`:

```tsx
"use client";

import { useState } from "react";
import TaskItem from "./TaskItem";

interface Task {
  id: number;
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
  rolledDays: number;
}

interface TaskListProps {
  initialTasks: Task[];
  readOnly?: boolean;
}

export default function TaskList({ initialTasks, readOnly = false }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");

  function handleToggle(id: number) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  async function handleDelete(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleAdd() {
    if (!newTask.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newTask }),
    });
    const task = await res.json();
    setTasks((prev) => [...prev, { ...task, rolledOver: false, rolledDays: 0 }]);
    setNewTask("");
    setAdding(false);
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          {...task}
          readOnly={readOnly}
          onToggle={handleToggle}
          onDelete={readOnly ? undefined : handleDelete}
        />
      ))}

      {!readOnly && (
        adding ? (
          <div className="flex gap-2 mt-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a task..."
              autoFocus
              className="flex-1 bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-1"
            />
            <button onClick={handleAdd} className="text-green-500 text-sm">
              add
            </button>
            <button
              onClick={() => { setAdding(false); setNewTask(""); }}
              className="text-gray-600 text-sm"
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-gray-600 text-sm mt-2 hover:text-gray-400 transition-colors"
          >
            + add task
          </button>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ProgressBar, QuoteBlock, WeatherBadge, StreakCounter, ScheduleBlock**

Create `src/components/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 mt-4">
      <div className="flex-1 bg-gray-800 rounded-full h-1">
        <div
          className="bg-green-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-500 text-xs">
        {completed}/{total} ({pct}%)
      </span>
    </div>
  );
}
```

Create `src/components/QuoteBlock.tsx`:

```tsx
interface QuoteBlockProps {
  quote: string;
}

export default function QuoteBlock({ quote }: QuoteBlockProps) {
  return (
    <div className="border-l-2 border-gray-700 pl-4 my-4">
      <p className="text-gray-400 text-sm italic leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
```

Create `src/components/WeatherBadge.tsx`:

```tsx
interface WeatherBadgeProps {
  weather: string;
}

export default function WeatherBadge({ weather }: WeatherBadgeProps) {
  return (
    <span className="text-gray-500 text-xs">
      Chicago {weather}
    </span>
  );
}
```

Create `src/components/StreakCounter.tsx`:

```tsx
interface StreakCounterProps {
  count: number;
}

export default function StreakCounter({ count }: StreakCounterProps) {
  if (count === 0) return null;

  return (
    <span className="text-xs text-gray-500">
      {count} day streak
    </span>
  );
}
```

Create `src/components/ScheduleBlock.tsx`:

```tsx
interface Event {
  title: string;
  startTime: string;
  endTime: string;
}

interface ScheduleBlockProps {
  events: Event[];
}

export default function ScheduleBlock({ events }: ScheduleBlockProps) {
  if (events.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
        Schedule
      </h3>
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-1 text-xs text-gray-500">
          <span className="text-gray-600">
            {e.startTime}–{e.endTime}
          </span>
          <span>{e.title}</span>
          <span className="text-gray-700">(recurring)</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create GenerateButton and FirstRunBanner components**

Create `src/components/GenerateButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GenerateButtonProps {
  label?: string;
  small?: boolean;
}

export default function GenerateButton({
  label = "Generate Today's Plan",
  small = false,
}: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    await fetch("/api/generate", { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  if (small) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-wider"
      >
        {loading ? "generating..." : label}
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="mt-4 text-sm text-green-500 hover:text-green-400 border border-green-500/30 rounded px-4 py-2"
    >
      {loading ? "generating..." : label}
    </button>
  );
}
```

Create `src/components/FirstRunBanner.tsx`:

```tsx
import Link from "next/link";

interface FirstRunBannerProps {
  show: boolean;
}

export default function FirstRunBanner({ show }: FirstRunBannerProps) {
  if (!show) return null;

  return (
    <div className="border border-gray-800 rounded px-4 py-3 mb-6">
      <p className="text-sm text-gray-400">
        Welcome! Set up your phone number and email to receive notifications.
      </p>
      <Link
        href="/settings"
        className="text-sm text-green-500 hover:text-green-400 mt-1 inline-block"
      >
        Go to Settings →
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: UI components — TaskItem, TaskList, ProgressBar, QuoteBlock, WeatherBadge, StreakCounter, ScheduleBlock, GenerateButton, FirstRunBanner"
```

---

## Task 11: Today Page (`/`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the Today page**

Replace `src/app/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { startOfDay, format } from "date-fns";
import TaskList from "@/components/TaskList";
import ProgressBar from "@/components/ProgressBar";
import QuoteBlock from "@/components/QuoteBlock";
import WeatherBadge from "@/components/WeatherBadge";
import StreakCounter from "@/components/StreakCounter";
import ScheduleBlock from "@/components/ScheduleBlock";
import FirstRunBanner from "@/components/FirstRunBanner";
import GenerateButton from "@/components/GenerateButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = startOfDay(new Date());

  const [plan, settings, recurringEvents] = await Promise.all([
    prisma.dailyPlan.findUnique({
      where: { date: today },
      include: { tasks: { orderBy: { order: "asc" } } },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.recurringEvent.findMany({ where: { active: true } }),
  ]);

  const needsSetup = !settings?.iMessagePhone && !settings?.emailAddress;

  const dayOfWeek = today.getDay();
  const todaysEvents = recurringEvents.filter((e) =>
    e.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
  );

  if (!plan) {
    return (
      <div>
        <FirstRunBanner show={needsSetup} />
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">
            No plan for today yet.
          </p>
          <GenerateButton />
        </div>
      </div>
    );
  }

  const completed = plan.tasks.filter((t) => t.completed).length;

  return (
    <div>
      <FirstRunBanner show={needsSetup} />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-gray-600">
            {format(today, "EEEE, MMMM d")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <StreakCounter count={plan.streakCount} />
          <WeatherBadge weather={plan.weatherSummary} />
        </div>
      </div>

      {/* Quote */}
      <QuoteBlock quote={plan.quote} />

      {/* Schedule */}
      <ScheduleBlock
        events={todaysEvents.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        }))}
      />

      {/* Tasks */}
      <TaskList
        initialTasks={plan.tasks.map((t) => ({
          id: t.id,
          text: t.text,
          urgency: t.urgency,
          completed: t.completed,
          rolledOver: t.rolledOver,
          rolledDays: t.rolledDays,
        }))}
      />

      {/* Progress */}
      <ProgressBar completed={completed} total={plan.tasks.length} />

      {/* Regenerate */}
      <div className="mt-8 text-center">
        <GenerateButton label="regenerate plan" small />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

```bash
npm run dev
```

Open `http://localhost:3000` — should show "No plan for today yet" with generate button.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: Today page — quote, tasks, progress bar, weather, streak, schedule"
```

---

## Task 12: Weekly Goals Page (`/week`)

**Files:**
- Create: `src/app/week/page.tsx`
- Create: `src/components/GoalSetupFlow.tsx`

- [ ] **Step 1: Create GoalSetupFlow client component**

Create `src/components/GoalSetupFlow.tsx`:

```tsx
"use client";

import { useState } from "react";

interface GoalSetupFlowProps {
  onComplete: () => void;
}

type Phase = "input" | "questioning" | "review";

interface GeneratedGoal {
  text: string;
  priority: string;
}

export default function GoalSetupFlow({ onComplete }: GoalSetupFlowProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [goals, setGoals] = useState<GeneratedGoal[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!input.trim()) return;
    setLoading(true);
    const res = await fetch("/api/goals/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    setSessionId(data.sessionId);
    setQuestion(data.question);
    setOptions(data.options);
    setQuestionNumber(1);
    setPhase("questioning");
    setLoading(false);
  }

  async function handleAnswer(index: number) {
    setLoading(true);
    const res = await fetch("/api/goals/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answer: String(index + 1) }),
    });
    const data = await res.json();

    if (data.done) {
      setGoals(data.goals);
      setPhase("review");
    } else {
      setQuestion(data.question);
      setOptions(data.options);
      setQuestionNumber(data.questionNumber);
    }
    setLoading(false);
  }

  async function handleConfirm(action: "accept" | "shuffle") {
    setLoading(true);
    const res = await fetch("/api/goals/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action, goals }),
    });
    const data = await res.json();

    if (data.reshuffled) {
      setGoals(data.goals);
    } else {
      onComplete();
    }
    setLoading(false);
  }

  if (phase === "input") {
    return (
      <div className="mt-6">
        <p className="text-sm text-gray-400 mb-3">
          What do you want to focus on this week?
        </p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="e.g., launch my saas, learn swift..."
            className="flex-1 bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-2"
          />
          <button
            onClick={handleStart}
            disabled={loading}
            className="text-sm text-green-500 hover:text-green-400"
          >
            {loading ? "..." : "go"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "questioning") {
    return (
      <div className="mt-6">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">
          Question {questionNumber} of 5-6
        </p>
        <p className="text-sm text-gray-300 mb-4">{question}</p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={loading}
              className="w-full text-left flex items-center gap-3 py-2 px-3 rounded border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <span className="text-green-500 text-sm w-5">{i + 1}</span>
              <span className="text-sm text-gray-300">{opt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Review phase
  return (
    <div className="mt-6">
      <p className="text-sm text-gray-400 mb-4">Here&apos;s your week:</p>
      <div className="space-y-2 mb-6">
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{i + 1}.</span>
            <span className="text-gray-200 flex-1">{g.text}</span>
            <span className="text-[9px] uppercase tracking-wider text-gray-500">
              {g.priority}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleConfirm("accept")}
          disabled={loading}
          className="text-sm text-green-500 border border-green-500/30 rounded px-4 py-2 hover:bg-green-500/10"
        >
          accept
        </button>
        <button
          onClick={() => handleConfirm("shuffle")}
          disabled={loading}
          className="text-sm text-gray-400 border border-gray-700 rounded px-4 py-2 hover:border-gray-500"
        >
          shuffle
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Week page**

Create `src/app/week/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import GoalSetupFlow from "@/components/GoalSetupFlow";

interface Goal {
  id: number;
  text: string;
  priority: string;
  active: boolean;
}

export default function WeekPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadGoals() {
    // Fetch via a simple API — we'll use the goals from the reflect endpoint or direct fetch
    // For now, use a lightweight approach
    setLoading(true);
    const res = await fetch("/api/goals/current");
    if (res.ok) {
      const data = await res.json();
      setGoals(data.goals);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGoals();
  }, []);

  const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const sortedGoals = [...goals].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[10px] uppercase tracking-widest text-gray-600">
          Weekly Goals
        </h1>
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="text-sm text-green-500 hover:text-green-400"
        >
          {showSetup ? "cancel" : "+ set new goals"}
        </button>
      </div>

      {showSetup ? (
        <GoalSetupFlow
          onComplete={() => {
            setShowSetup(false);
            loadGoals();
          }}
        />
      ) : loading ? (
        <p className="text-gray-600 text-sm">Loading...</p>
      ) : sortedGoals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No goals set for this week.</p>
          <button
            onClick={() => setShowSetup(true)}
            className="mt-4 text-sm text-green-500"
          >
            Set your first goals
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedGoals.map((g) => (
            <div key={g.id} className="flex items-center gap-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-sm text-gray-200 flex-1">{g.text}</span>
              <span className="text-[9px] uppercase tracking-wider text-gray-500">
                {g.priority}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add GET /api/goals/current helper route**

Create `src/app/api/goals/current/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const goals = await prisma.weeklyGoal.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ goals });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/week/ src/components/GoalSetupFlow.tsx src/app/api/goals/current/
git commit -m "feat: Weekly Goals page — smart question flow, goal list, accept/shuffle"
```

---

## Task 13: History Pages (`/history` and `/history/[date]`)

**Files:**
- Create: `src/app/history/page.tsx`
- Create: `src/app/history/[date]/page.tsx`

- [ ] **Step 1: Create History list page**

Create `src/app/history/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const plans = await prisma.dailyPlan.findMany({
    orderBy: { date: "desc" },
    include: {
      tasks: { select: { completed: true } },
    },
    take: 90,
  });

  return (
    <div>
      <h1 className="text-[10px] uppercase tracking-widest text-gray-600 mb-6">
        History
      </h1>

      {plans.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">
          No history yet.
        </p>
      ) : (
        <div className="space-y-1">
          {plans.map((plan) => {
            const total = plan.tasks.length;
            const done = plan.tasks.filter((t) => t.completed).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const dateStr = format(plan.date, "yyyy-MM-dd");

            return (
              <Link
                key={plan.id}
                href={`/history/${dateStr}`}
                className="flex items-center justify-between py-3 px-2 rounded hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300">
                    {format(plan.date, "EEE, MMM d")}
                  </span>
                  {plan.streakCount > 0 && (
                    <span className="text-[9px] text-gray-600">
                      streak {plan.streakCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 bg-gray-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${
                        pct === 100 ? "bg-green-500" : "bg-gray-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create History detail page**

Create `src/app/history/[date]/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { startOfDay, format, parseISO } from "date-fns";
import { notFound } from "next/navigation";
import TaskList from "@/components/TaskList";
import ProgressBar from "@/components/ProgressBar";
import QuoteBlock from "@/components/QuoteBlock";
import WeatherBadge from "@/components/WeatherBadge";
import StreakCounter from "@/components/StreakCounter";
import ScheduleBlock from "@/components/ScheduleBlock";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryDetail({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date: dateParam } = await params;
  const date = startOfDay(parseISO(dateParam));

  const plan = await prisma.dailyPlan.findUnique({
    where: { date },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!plan) notFound();

  const recurringEvents = await prisma.recurringEvent.findMany({
    where: { active: true },
  });

  const dayOfWeek = date.getDay();
  const todaysEvents = recurringEvents.filter((e) =>
    e.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
  );

  const completed = plan.tasks.filter((t) => t.completed).length;

  return (
    <div>
      <Link
        href="/history"
        className="text-xs text-gray-600 hover:text-gray-400 mb-4 inline-block"
      >
        ← back to history
      </Link>

      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] uppercase tracking-widest text-gray-600">
          {format(date, "EEEE, MMMM d, yyyy")}
        </span>
        <div className="flex items-center gap-4">
          <StreakCounter count={plan.streakCount} />
          <WeatherBadge weather={plan.weatherSummary} />
        </div>
      </div>

      <QuoteBlock quote={plan.quote} />

      <ScheduleBlock
        events={todaysEvents.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        }))}
      />

      <TaskList
        initialTasks={plan.tasks.map((t) => ({
          id: t.id,
          text: t.text,
          urgency: t.urgency,
          completed: t.completed,
          rolledOver: t.rolledOver,
          rolledDays: t.rolledDays,
        }))}
        readOnly
      />

      <ProgressBar completed={completed} total={plan.tasks.length} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/history/
git commit -m "feat: History pages — day list with completion bars + read-only detail view"
```

---

## Task 14: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/SettingsForm.tsx`
- Create: `src/components/RecurringManager.tsx`

- [ ] **Step 1: Create SettingsForm component**

Create `src/components/SettingsForm.tsx`:

```tsx
"use client";

import { useState } from "react";

interface SettingsData {
  iMessagePhone: string;
  emailAddress: string;
  morningTime: string;
  middayTime: string;
  eveningTime: string;
  timezone: string;
  macLocalIp: string;
}

export default function SettingsForm({ initial }: { initial: SettingsData }) {
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields: { key: keyof SettingsData; label: string; placeholder: string }[] = [
    { key: "iMessagePhone", label: "Phone (iMessage)", placeholder: "+11234567890" },
    { key: "emailAddress", label: "Email (fallback)", placeholder: "you@example.com" },
    { key: "morningTime", label: "Morning plan time", placeholder: "06:30" },
    { key: "middayTime", label: "Midday nudge time", placeholder: "12:30" },
    { key: "eveningTime", label: "Evening wrap-up time", placeholder: "20:30" },
    { key: "timezone", label: "Timezone", placeholder: "America/Chicago" },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-[10px] uppercase tracking-wider text-gray-600 block mb-1">
            {f.label}
          </label>
          <input
            value={data[f.key]}
            onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="w-full bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-2 focus:border-green-500 transition-colors"
          />
        </div>
      ))}

      <div className="pt-4">
        <label className="text-[10px] uppercase tracking-wider text-gray-600 block mb-1">
          Local IP (for Apple Shortcuts)
        </label>
        <p className="text-sm text-gray-400 font-mono">
          {data.macLocalIp || "detecting..."}
        </p>
        <p className="text-[10px] text-gray-600 mt-1">
          Use this in your Shortcut URL: http://{data.macLocalIp || "..."}:3000/api/today/voice
        </p>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 text-sm text-green-500 border border-green-500/30 rounded px-4 py-2 hover:bg-green-500/10"
      >
        {saved ? "saved!" : "save settings"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create RecurringManager component**

Create `src/components/RecurringManager.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

interface RecurringEvent {
  id: number;
  title: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurringManager() {
  const [events, setEvents] = useState<RecurringEvent[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    days: [] as number[],
    startTime: "",
    endTime: "",
  });

  async function loadEvents() {
    const res = await fetch("/api/recurring");
    const data = await res.json();
    setEvents(data);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleAdd() {
    if (!form.title || form.days.length === 0 || !form.startTime || !form.endTime) return;
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        daysOfWeek: form.days.join(","),
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    });
    setForm({ title: "", days: [], startTime: "", endTime: "" });
    setAdding(false);
    loadEvents();
  }

  async function handleToggle(event: RecurringEvent) {
    await fetch("/api/recurring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, active: !event.active }),
    });
    loadEvents();
  }

  async function handleDelete(id: number) {
    await fetch("/api/recurring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadEvents();
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
          <div className="flex gap-2">
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
                  {e.startTime}–{e.endTime}
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
```

- [ ] **Step 3: Create Settings page**

Create `src/app/settings/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/SettingsForm";
import RecurringManager from "@/components/RecurringManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 1 } });
  }

  return (
    <div>
      <h1 className="text-[10px] uppercase tracking-widest text-gray-600 mb-6">
        Settings
      </h1>

      <SettingsForm initial={settings} />

      <hr className="border-gray-800 my-8" />

      <RecurringManager />

      <hr className="border-gray-800 my-8" />

      <div>
        <h2 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">
          Apple Shortcuts Setup
        </h2>
        <div className="text-xs text-gray-500 space-y-2">
          <p>
            <strong className="text-gray-400">&quot;My Day&quot; (morning alarm):</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Create Shortcut → Get Contents of URL → http://{settings.macLocalIp || "<mac-ip>"}:3000/api/today/voice</li>
            <li>Speak Text → (result from previous action)</li>
            <li>Automations → When Alarm Is Stopped → Run &quot;My Day&quot;</li>
          </ol>
          <p className="mt-3">
            <strong className="text-gray-400">&quot;Set My Week&quot; (voice goal setup):</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Dictate Text → POST to http://{settings.macLocalIp || "<mac-ip>"}:3000/api/goals/setup</li>
            <li>Repeat loop: Speak Text → Dictate Text → POST to /api/goals/answer</li>
            <li>When response contains &quot;goals:&quot; → Speak Text → POST to /api/goals/confirm</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/ src/components/SettingsForm.tsx src/components/RecurringManager.tsx
git commit -m "feat: Settings page — contact info, notification times, recurring events, Shortcut setup guide"
```

---

## Task 15: Review Page (`/review`)

**Files:**
- Create: `src/app/review/page.tsx`
- Create: `src/components/ReflectionCard.tsx`

- [ ] **Step 1: Create ReflectionCard component**

Create `src/components/ReflectionCard.tsx`:

```tsx
interface GoalBreakdown {
  goalId: number;
  goalText: string;
  tasksCompleted: number;
  tasksTotal: number;
}

interface ReflectionCardProps {
  tasksCompleted: number;
  tasksTotal: number;
  goalsBreakdown: GoalBreakdown[];
  carryForward: string[];
  summary: string;
}

export default function ReflectionCard({
  tasksCompleted,
  tasksTotal,
  goalsBreakdown,
  carryForward,
  summary,
}: ReflectionCardProps) {
  const pct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <div>
      {/* Summary */}
      <div className="border-l-2 border-gray-700 pl-4 mb-6">
        <p className="text-sm text-gray-400 italic leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Scorecard */}
      <div className="flex gap-6 mb-6">
        <div>
          <span className="text-2xl text-gray-200">{tasksCompleted}</span>
          <span className="text-sm text-gray-600">/{tasksTotal} tasks</span>
        </div>
        <div>
          <span className="text-2xl text-gray-200">{pct}%</span>
          <span className="text-sm text-gray-600"> completion</span>
        </div>
      </div>

      {/* Per-goal breakdown */}
      {goalsBreakdown.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">
            Goals Breakdown
          </h3>
          <div className="space-y-2">
            {goalsBreakdown.map((g) => {
              const gPct = g.tasksTotal > 0 ? Math.round((g.tasksCompleted / g.tasksTotal) * 100) : 0;
              return (
                <div key={g.goalId} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 flex-1">{g.goalText}</span>
                  <div className="w-16 bg-gray-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${gPct === 100 ? "bg-green-500" : "bg-gray-500"}`}
                      style={{ width: `${gPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {g.tasksCompleted}/{g.tasksTotal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carry forward */}
      {carryForward.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">
            Carry Forward
          </h3>
          <div className="space-y-1">
            {carryForward.map((task, i) => (
              <div key={i} className="text-sm text-gray-500">
                • {task}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Review page**

Create `src/app/review/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import ReflectionCard from "@/components/ReflectionCard";
import Link from "next/link";

interface Reflection {
  exists: boolean;
  tasksCompleted: number;
  tasksTotal: number;
  goalsBreakdown: { goalId: number; goalText: string; tasksCompleted: number; tasksTotal: number }[];
  carryForward: string[];
  summary: string;
}

export default function ReviewPage() {
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadReflection() {
    setLoading(true);
    const res = await fetch("/api/reflect");
    const data = await res.json();
    setReflection(data);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/reflect", { method: "POST" });
    const data = await res.json();
    setReflection({ exists: true, ...data });
    setGenerating(false);
  }

  useEffect(() => {
    loadReflection();
  }, []);

  if (loading) {
    return <p className="text-gray-600 text-sm">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-[10px] uppercase tracking-widest text-gray-600 mb-6">
        Weekly Reflection
      </h1>

      {!reflection?.exists ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm mb-4">
            No reflection generated for this week yet.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="text-sm text-green-500 border border-green-500/30 rounded px-4 py-2 hover:bg-green-500/10"
          >
            {generating ? "generating..." : "Generate Reflection"}
          </button>
        </div>
      ) : (
        <>
          <ReflectionCard
            tasksCompleted={reflection.tasksCompleted}
            tasksTotal={reflection.tasksTotal}
            goalsBreakdown={reflection.goalsBreakdown}
            carryForward={reflection.carryForward}
            summary={reflection.summary}
          />

          <div className="mt-8 text-center">
            <Link
              href="/week"
              className="text-sm text-green-500 border border-green-500/30 rounded px-4 py-2 hover:bg-green-500/10 inline-block"
            >
              Set Next Week&apos;s Goals →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/review/ src/components/ReflectionCard.tsx
git commit -m "feat: Review page — weekly reflection scorecard, goals breakdown, carry-forward"
```

---

## Task 16: Navigation

**Files:**
- Create: `src/components/Nav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create Nav component**

Create `src/components/Nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "today" },
  { href: "/week", label: "goals" },
  { href: "/history", label: "history" },
  { href: "/review", label: "review" },
  { href: "/settings", label: "settings" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 mb-8 border-b border-gray-800 pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-xs uppercase tracking-wider transition-colors ${
            pathname === link.href
              ? "text-green-500"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Add Nav to layout**

Update `src/app/layout.tsx` to add `<Nav />` inside `<main>`, before `{children}`.

Import:
```tsx
import Nav from "@/components/Nav";
```

Add before `{children}`:
```tsx
<Nav />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.tsx src/app/layout.tsx
git commit -m "feat: navigation bar across all pages"
```

---

## Task 17: Cron System

**Files:**
- Create: `src/lib/cron.ts`
- Modify: `src/app/layout.tsx` (init cron on server start)

- [ ] **Step 1: Implement cron scheduler**

Create `src/lib/cron.ts`:

```typescript
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { generateDailyPlan } from "@/lib/generate-plan";
import { notify } from "@/lib/notifications";
import { startOfDay, startOfWeek, endOfWeek } from "date-fns";

let initialized = false;

function timeToCron(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return `${minute} ${hour} * * *`;
}

export async function initCron() {
  if (initialized) return;
  initialized = true;

  console.log("[cron] Initializing scheduled jobs...");

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const morningTime = settings?.morningTime || "06:30";
  const middayTime = settings?.middayTime || "12:30";
  const eveningTime = settings?.eveningTime || "20:30";
  const tz = settings?.timezone || "America/Chicago";

  // Morning plan generation
  cron.schedule(
    timeToCron(morningTime),
    async () => {
      console.log("[cron] Generating daily plan...");
      try {
        await generateDailyPlan();
        console.log("[cron] Daily plan generated successfully");
      } catch (err) {
        console.error("[cron] Plan generation failed:", err);
        await notify(
          "Couldn't generate today's plan. Open the app to create a manual plan: http://localhost:3000"
        );
      }
    },
    { timezone: tz }
  );

  // Midday nudge
  cron.schedule(
    timeToCron(middayTime),
    async () => {
      console.log("[cron] Checking midday progress...");
      const today = startOfDay(new Date());
      const plan = await prisma.dailyPlan.findUnique({
        where: { date: today },
        include: { tasks: true },
      });

      if (!plan) return;

      const total = plan.tasks.length;
      const done = plan.tasks.filter((t) => t.completed).length;

      if (total > 0 && done / total < 0.5) {
        const remaining = plan.tasks.filter((t) => !t.completed);
        const urgent = remaining.find((t) => t.urgency === "URGENT");
        const message = urgent
          ? `You've got ${remaining.length} tasks left today. The urgent one is: ${urgent.text}`
          : `You've got ${remaining.length} tasks left today. Keep pushing!`;
        await notify(message);
      }
    },
    { timezone: tz }
  );

  // Evening wrap-up
  cron.schedule(
    timeToCron(eveningTime),
    async () => {
      console.log("[cron] Evening wrap-up check...");
      const today = startOfDay(new Date());
      const plan = await prisma.dailyPlan.findUnique({
        where: { date: today },
        include: { tasks: true },
      });

      if (!plan) return;

      const incomplete = plan.tasks.filter((t) => !t.completed);
      if (incomplete.length > 0) {
        const taskList = incomplete.map((t) => `• ${t.text}`).join("\n");
        const settings = await prisma.settings.findUnique({ where: { id: 1 } });
        const ip = settings?.macLocalIp || "localhost";
        await notify(
          `${incomplete.length} tasks still open:\n${taskList}\n\nCarry forward or drop: http://${ip}:3000`
        );
      }
    },
    { timezone: tz }
  );

  // Sunday reflection — 6pm (generates + stores WeeklyReflection, then notifies)
  cron.schedule(
    "0 18 * * 0",
    async () => {
      console.log("[cron] Generating weekly reflection...");
      try {
        // Call the reflect API to generate and store the WeeklyReflection
        const res = await fetch("http://localhost:3000/api/reflect", {
          method: "POST",
        });
        const reflection = await res.json();

        const s = await prisma.settings.findUnique({ where: { id: 1 } });
        const ip = s?.macLocalIp || "localhost";
        const pct =
          reflection.tasksTotal > 0
            ? Math.round(
                (reflection.tasksCompleted / reflection.tasksTotal) * 100
              )
            : 0;

        await notify(
          `Week's wrapping up! Scorecard: ${reflection.tasksCompleted}/${reflection.tasksTotal} tasks (${pct}%).\n\n${reflection.summary}\n\nSet next week's goals: http://${ip}:3000/review`,
          "Weekly Reflection"
        );
      } catch (err) {
        console.error("[cron] Weekly reflection failed:", err);
      }
    },
    { timezone: tz }
  );

  console.log("[cron] All jobs scheduled");
}
```

- [ ] **Step 2: Initialize cron on server start**

Create `src/lib/init.ts`:

```typescript
import { initCron } from "@/lib/cron";

// Only init cron on the server side, once
if (typeof window === "undefined") {
  initCron();
}
```

Add this import to `src/app/layout.tsx` at the top:

```typescript
import "@/lib/init";
```

- [ ] **Step 3: Verify cron logs on dev start**

```bash
npm run dev
```

Expected: Console shows "[cron] Initializing scheduled jobs..." and "[cron] All jobs scheduled"

- [ ] **Step 4: Commit**

```bash
git add src/lib/cron.ts src/lib/init.ts src/app/layout.tsx
git commit -m "feat: cron system — morning plan, midday nudge, evening wrap-up, Sunday reflection"
```

---

## Task 18: Quote Data File

**Files:**
- Create: `src/data/quotes.json` (full 200+ quotes)

- [ ] **Step 1: Generate full quotes file**

Create `src/data/quotes.json` with 200+ quotes. Include quotes from:

- Entrepreneurship: Steve Jobs, Elon Musk, Paul Graham, Naval Ravikant, Peter Thiel, Marc Andreessen, Sam Altman, etc.
- Discipline: Jocko Willink, David Goggins, Marcus Aurelius, Seneca, Epictetus, etc.
- Focus/grind: Cal Newport, James Clear, Ryan Holiday, etc.

Each entry:
```json
{"text": "...", "theme": "entrepreneurship|discipline|focus|grind"}
```

Rule: NO quotes about love, relationships, or women. Only building, creating, discipline, and hustle.

- [ ] **Step 2: Commit**

```bash
git add src/data/quotes.json
git commit -m "feat: curated quotes — 200+ entrepreneurship, discipline, focus, grind quotes"
```

---

## Task 19: Final Integration & Polish

**Files:**
- Create: `.env.example`
- Modify: various small fixes

- [ ] **Step 1: Ensure .env.example is complete**

Verify `.env.example`:

```env
OPENAI_API_KEY=sk-...
WEATHER_API_KEY=...
RESEND_API_KEY=re_...
```

- [ ] **Step 2: Create .env.local with user's actual keys**

Prompt user:
> "Create `.env.local` with your actual API keys. You'll need:
> 1. OpenAI API key from https://platform.openai.com
> 2. WeatherAPI key from https://www.weatherapi.com
> 3. Resend API key from https://resend.com"

- [ ] **Step 3: Run full app and verify**

```bash
npm run dev
```

Test flow:
1. Open `http://localhost:3000` — should show "No plan" state
2. Go to `/settings` — enter phone number and email
3. Go to `/week` — start goal setup flow
4. Click "Generate Today's Plan" on `/`
5. Toggle tasks, verify progress bar updates
6. Check `/history` shows the day
7. Check `/review`

- [ ] **Step 4: Test voice endpoint**

```bash
curl http://localhost:3000/api/today/voice
```

Expected: Plain text daily summary

- [ ] **Step 5: Test iMessage (manual)**

Trigger plan generation and verify iMessage arrives on phone.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: day planner v1 — proactive daily planning with voice, iMessage, and smart goals"
```
