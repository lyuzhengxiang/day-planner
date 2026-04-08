<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Day Planner

## Project Summary

Day Planner is a proactive daily planning app. It generates a daily task list from weekly goals, recurring constraints, weather, and carry-over work, then delivers that plan through the web UI, voice, and scheduled email reminders.

This is not a toy in-memory assignment app. The current implementation intentionally uses Prisma persistence, server-rendered routes, API routes, hosted deployment assumptions, and external integrations.

## Stack

- Next.js 16.2.2 App Router
- React 19
- Tailwind CSS 4
- Prisma 6 with PostgreSQL
- OpenAI for goal setup, plan generation, and weekly reflection
- WeatherAPI for current weather
- Resend for email delivery
- Vercel deployment target
- External scheduler support through authenticated cron routes

## Canonical Data

- Root `.env` or deployed environment must define `DATABASE_URL` as a PostgreSQL connection string
- `prisma/schema.prisma` reads `env("DATABASE_URL")`
- `prisma.config.ts` loads `.env` for Prisma CLI
- Use `.env.example` as the source of truth for required deployment variables

Do not reintroduce local SQLite assumptions on this branch.

## Environment Variables

- `DATABASE_URL`
- `APP_BASE_URL`
- `CRON_SECRET`
- `OPENAI_API_KEY`
- `WEATHER_API_KEY`
- `RESEND_API_KEY`

The app can render without every external key, but these integrations degrade:

- Missing `OPENAI_API_KEY`: goal setup, plan generation, and reflection generation fail when invoked
- Missing `WEATHER_API_KEY`: weather falls back to `"Weather unavailable"`
- Missing `RESEND_API_KEY`: scheduled notifications are skipped
- Missing `APP_BASE_URL`: links fall back to `http://localhost:3000`
- Missing `CRON_SECRET`: external cron routes reject requests

## Primary Pages

- `/`
  Today view. Shows first-run setup warning, current weather, quote, streak, recurring events, and the interactive task list for today. If no plan exists yet, this page offers plan generation and a link to weekly goals.
- `/week`
  Weekly goal management. Lists active goals, shows carry-forward suggestions from the last reflection, and hosts the guided goal-setup flow.
- `/history`
  Saved daily plans with completion summaries.
- `/history/[date]`
  Read-only detail view for a saved day.
- `/review`
  Weekly reflection page. Shows the stored scorecard or lets the user generate one.
- `/settings`
  Delivery settings, reminder windows, timezone, deployed app URL reference, and recurring events.

## API Surface

- `/api/generate`
  Generates or regenerates today’s plan.
- `/api/today/voice`
  Returns a plain-text spoken summary for Siri Shortcuts / TTS.
- `/api/tasks`
  Creates ad-hoc tasks.
- `/api/tasks/[id]`
  Toggles, edits, or deletes a task.
- `/api/tasks/reorder`
  Reorders tasks.
- `/api/goals/setup`
  Starts the AI-assisted weekly goal flow.
- `/api/goals/answer`
  Accepts one answer in that flow and returns the next step.
- `/api/goals/confirm`
  Accepts or reshuffles generated weekly goals.
- `/api/goals/current`
  Returns current active weekly goals.
- `/api/reflect`
  Generates or fetches the weekly reflection.
- `/api/settings`
  Reads and updates the singleton settings row.
- `/api/recurring`
  CRUD for recurring events.
- `/api/weather`
  Returns the current weather snapshot.
- `/api/streak`
  Returns the current streak count.
- `/api/cron/[job]`
  External scheduler entry point for `morning`, `midday`, `evening`, and `weekly-review`.

## Core Data Model

- `Settings`
  Singleton delivery and scheduling settings row.
- `GoalSession`
  Temporary state for the weekly goal interview.
- `WeeklyGoal`
  Active goal list that drives plan generation.
- `DailyPlan`
  Per-day generated plan metadata.
- `Task`
  Generated or ad-hoc tasks belonging to a daily plan.
- `RecurringEvent`
  Fixed time blocks injected into the day.
- `WeeklyReflection`
  Stored weekly scorecard and carry-forward list.
- `QuoteLog`
  Tracks recent quotes to reduce repeats.

## Runtime Behavior Notes

- The app is designed to deploy as a web app on Vercel.
- Scheduled work should be triggered by an external scheduler hitting `/api/cron/[job]`.
- Notification delivery is email-only on this branch.
- Build should not require a live OpenAI client at import time. Keep external clients lazily initialized where possible.
- Server-rendered pages query Prisma directly. API routes are mainly for mutations, automation entry points, and voice output.

## Design Direction

- Dark, low-clutter interface
- Monospace-forward typography
- Thin borders, subtle green accents, restrained motion
- Preserve the existing local-tool feeling; do not turn it into a generic SaaS dashboard

## Verification Baseline

Before claiming significant work is complete, run:

- `npm test`
- `npm run lint`
- `npm run build`

For runtime-sensitive changes, also boot the dev server and verify at least the core path:

- `/`
- `/week`
- `/settings`
- `/review`
- relevant API routes affected by the change
