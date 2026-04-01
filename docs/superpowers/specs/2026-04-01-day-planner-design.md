# Day Planner — Design Spec

## Overview

A proactive, voice-integrated daily planning app that generates your day before you wake up, texts it to you, and reads it aloud when your alarm goes off. Built for entrepreneurs and students who want structure without friction.

**Core philosophy: Proactive, not passive.** The app doesn't wait for instructions — it pushes what you need, when you need it.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Database:** SQLite via Prisma
- **AI:** OpenAI API (GPT-5.4)
- **Cron:** node-cron (in-process)
- **Weather:** WeatherAPI.com
- **iMessage:** AppleScript via Node.js child_process
- **Email:** Resend (fallback)
- **Voice:** Apple Shortcuts + Siri TTS
- **Runs locally** on macOS at `localhost:3000` (binds `0.0.0.0` for local network access)

## Visual Design

Dark minimal aesthetic:
- Background: `#0a0a0a`
- Font: Monospace (SF Mono / JetBrains Mono)
- Urgency indicators: color-coded dots (red = urgent, amber = high, blue = medium, green = low/complete)
- Progress bars: thin, green fill on dark track
- Zero clutter — tasks, quote, weather, progress. Nothing else.

## Data Model

### WeeklyGoal
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| goalSessionId | Int (FK → GoalSession) | The session that created this goal |
| text | String | Goal description |
| priority | Enum (URGENT, HIGH, MEDIUM, LOW) | Goal priority |
| weekStart | DateTime | Monday of the goal's week |
| active | Boolean | Whether goal is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last modified |

### DailyPlan
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| date | DateTime (unique) | The day this plan is for |
| quote | String | Daily motivational quote |
| weatherSummary | String | Weather snapshot for Chicago |
| markdownPath | String | Path to exported `.md` file |
| streakCount | Int | Streak as of this day |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last modified |

### Task
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| dailyPlanId | Int (FK → DailyPlan) | Parent plan |
| weeklyGoalId | Int? (FK → WeeklyGoal, nullable) | The weekly goal this task supports |
| text | String | Task description |
| urgency | Enum (URGENT, HIGH, MEDIUM, LOW) | Urgency level |
| completed | Boolean | Whether task is done |
| rolledOver | Boolean | Carried from a previous day |
| rolledDays | Int | Number of days this task has rolled |
| order | Int | Display order |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last modified |

### RecurringEvent
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| title | String | Event name |
| daysOfWeek | String | Comma-separated days, e.g. "1,3,5" for MWF (0=Sun, 6=Sat) |
| startTime | String | e.g., "09:00" |
| endTime | String | e.g., "10:30" |
| active | Boolean | Whether event is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last modified |

### Settings
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Singleton row |
| iMessagePhone | String | Phone number for iMessage |
| emailAddress | String | Fallback email |
| morningTime | String | Daily plan generation time (default "06:30") |
| middayTime | String | Midday nudge time (default "12:30") |
| eveningTime | String | Evening wrap-up time (default "20:30") |
| timezone | String | Default "America/Chicago" |
| macLocalIp | String | Auto-detected, shown in settings for Shortcut setup |

API keys (`OPENAI_API_KEY`, `WEATHER_API_KEY`, `RESEND_API_KEY`) are stored in `.env.local`, not in the database.

**Settings initialization:** On first app boot, a Prisma seed script creates the singleton Settings row with empty strings for `iMessagePhone` and `emailAddress` and defaults for times/timezone. The app shows a first-run banner on `/` directing to `/settings` if phone/email are not configured. Cron jobs check for configured contact info before attempting notifications — if unconfigured, they skip notification but still generate the plan and save to DB/`.md`.

### GoalSession
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| initialInput | String | User's brief input (text or spoken) |
| questions | JSON | Array of {question, options, answer} |
| status | Enum (IN_PROGRESS, COMPLETED) | Session state |
| createdAt | DateTime | Creation timestamp |

When a GoalSession completes via `/api/goals/confirm`, it creates WeeklyGoal rows linked back via `goalSessionId`.

### WeeklyReflection
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| weekStart | DateTime | Monday of the reflected week |
| tasksCompleted | Int | Total tasks completed |
| tasksTotal | Int | Total tasks generated |
| goalsBreakdown | JSON | Per-goal: {goalId, goalText, tasksCompleted, tasksTotal} |
| carryForward | JSON | Array of task texts to suggest carrying forward |
| summary | String | AI-generated reflection text |
| createdAt | DateTime | Creation timestamp |

### QuoteLog
| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| quoteText | String | The quote that was used |
| usedOn | DateTime | Date the quote was shown |

Used to enforce the 30-day no-repeat rule. On generation, query QuoteLog for the last 30 days and exclude those quotes from selection.

## Pages

### `/` — Today
- Daily quote in a left-bordered block
- Weather summary top-right (temperature, condition)
- Task list with checkboxes, urgency badges, and "rolled from yesterday" labels
- Progress bar with percentage
- Streak counter
- Recurring events for today shown as pinned schedule blocks above tasks
- Data fetched via Next.js server components querying Prisma directly (no separate API call needed)

### `/week` — Weekly Goals
- Current active goals listed with priorities
- "Set new goals" button opens the smart question flow
- Question flow: one question at a time, multiple choice (click a number), 5-6 questions
- Final screen: generated goals with accept / edit / shuffle options
- Shows carried-forward items from last week

### `/history` — History
- Calendar or list view of past days
- Each day shows: date, completion percentage, streak indicator
- Click to open `/history/[date]`
- Data fetched via server component: query all DailyPlans with aggregated task completion counts

### `/history/[date]` — Day Detail
- Same layout as `/` but read-only (no checkboxes)
- Rendered from database via server component

### `/settings` — Settings
- Phone number for iMessage
- Email address for fallback
- Notification times (morning, midday, evening)
- Timezone
- Recurring events manager (add/edit/delete/pause)
- Mac local IP display for Apple Shortcut setup
- Apple Shortcut setup instructions

### `/review` — Weekly Reflection
- Scorecard: tasks completed vs total, goals progress, streak
- Per-goal breakdown: what got done, what didn't (computed via Task → WeeklyGoal relationship)
- Carry-forward suggestions
- Prompt to set next week's goals (links to `/week`)
- If no reflection exists for this week, shows a "Generate Reflection" button that calls `POST /api/reflect`
- If reflection exists, shows the stored WeeklyReflection data

## API Routes

### Daily Plan
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/generate` | Generate daily plan. If plan already exists for today, regenerates (deletes old tasks, creates new ones). Called by cron + manual trigger. |
| GET | `/api/today/voice` | Plain text summary for Siri TTS |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| PATCH | `/api/tasks/[id]` | Toggle task completion, re-exports `.md` |
| POST | `/api/tasks` | Add an ad-hoc task to today's plan (manual mid-day additions) |
| DELETE | `/api/tasks/[id]` | Drop a task (removes from plan, won't carry forward) |
| PUT | `/api/tasks/[id]` | Edit task text or urgency |
| PATCH | `/api/tasks/reorder` | Reorder tasks (accepts array of {id, order}) |

### Weekly Goals
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/goals/setup` | Start goal question flow (accepts text/spoken input) |
| POST | `/api/goals/answer` | Submit answer, returns next question or final goals |
| POST | `/api/goals/confirm` | Accept, shuffle, or edit. Creates WeeklyGoal rows from GoalSession. |

### Reflection
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/reflect` | Generate and store weekly reflection scorecard |
| GET | `/api/reflect` | Retrieve stored reflection for a given week (query param: `?week=2026-03-30`) |

### Other
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/weather` | Fetch Chicago weather from WeatherAPI.com |
| GET | `/api/streak` | Current streak count |
| GET/PUT | `/api/settings` | Read/update settings |
| GET/POST/PUT/DELETE | `/api/recurring` | CRUD for recurring events |

Note: The `/` (Today), `/history`, and `/history/[date]` pages use Next.js server components with direct Prisma queries — no separate GET API routes needed. API routes are only for mutations, cron-triggered actions, and Siri voice endpoints.

## Proactive Notification System

### Cron Schedule (all times configurable, default CT)

| Job | Time | Trigger | Action |
|-----|------|---------|--------|
| generateDailyPlan | 6:30am | Daily | OpenAI generates tasks from weekly goals + recurring events → fetch weather → save to DB → export `.md` → iMessage + email |
| middayNudge | 12:30pm | Daily, if <50% tasks done | iMessage: "You've got X tasks left. The urgent one is [Y]." |
| eveningWrapUp | 8:30pm | Daily, if incomplete tasks | iMessage: "[X] still open. Open the app to carry forward or drop: http://<mac-ip>:3000" |
| sundayReflection | 6:00pm | Sundays | Generate scorecard + store WeeklyReflection → iMessage + email with summary → link to `/review` to set next week's goals |

### Evening Wrap-Up Interaction
The evening iMessage is **one-way informational** — it lists incomplete tasks and links to the app. The user opens the app to decide what to carry forward or drop. No two-way iMessage interaction is needed. If the user ignores it, the smart carry-forward system handles it automatically the next morning.

### iMessage Delivery
- AppleScript via `child_process.exec`: `tell application "Messages" to send "..." to buddy "+1XXXXXXXXXX"`
- Requires Mac to be on and Messages app signed in
- Falls back to email (Resend) if AppleScript execution fails

### Smart Carry-Forward
- Unfinished tasks at end of day: flagged `rolledOver: true`, `rolledDays` incremented
- Next morning's plan includes them with bumped urgency and "rolled from yesterday" label
- After 3+ days rolling: "This has been sitting for 3 days — do it today or drop it?"

## Quote System

- Curated JSON file of 200+ quotes tagged by theme: `entrepreneurship`, `discipline`, `focus`, `grind`
- OpenAI can also generate contextual quotes based on current goals and week progress
- Rule: quotes are about building, creating, discipline, hustle — never about relationships or women
- No repeat within 30 days, enforced via `QuoteLog` table
- On generation: query QuoteLog for last 30 days, exclude those, pick from remaining pool (or generate fresh via OpenAI if pool is exhausted)

## Streak Tracker

- A day counts as "complete" if all tasks are marked done
- Streak = consecutive complete days (only days with a generated plan count — weekends/days without plans don't break the streak)
- Resets when a day has a plan but not all tasks are completed
- Displayed on home page as a small counter
- Referenced in morning voice summary and weekly reflection

## Markdown Export

Each day saved to `days/YYYY-MM-DD.md` (directory auto-created on first export):

```markdown
# Tuesday, April 1, 2026
> Chicago — 48°F, Partly Cloudy

> "Stop thinking about what could go wrong and start thinking about what could go right."

## Schedule
- 09:00–10:30 CS 101 Lecture (recurring)
- 14:00–15:00 Office Hours (recurring)

## Tasks
- [x] Ship landing page MVP `URGENT`
- [ ] Review analytics dashboard `HIGH` *(rolled from yesterday)*
- [ ] Write investor outreach emails `MEDIUM`

## Progress
██████░░░░░░░░░░ 1/3 (33%)
```

- Re-exported on every task toggle to keep `.md` in sync with DB
- Stored in `days/` folder at project root

## Voice Integration (Apple Shortcuts + Siri)

### Morning Alarm Companion
1. User dismisses iPhone alarm
2. iOS Automation triggers "My Day" Shortcut
3. Shortcut calls `GET http://<mac-local-ip>:3000/api/today/voice`
4. Siri reads response aloud:
   > "Good morning. It's Tuesday, April 1st. 48 degrees and partly cloudy in Chicago. Your quote: [quote]. You have 4 tasks today. Your urgent task is: Ship landing page. High priority: Review analytics and Write outreach emails. You're on a 5 day streak. Let's keep it going."

### Weekly Goal Setup via Siri
1. User says "Hey Siri, set my week" → triggers "Set My Week" Shortcut
2. Shortcut uses Siri dictation to capture brief input
3. Hits `POST /api/goals/setup` with spoken text
4. API returns first question as plain text
5. Siri reads question aloud, user speaks a number
6. Shortcut loops: `POST /api/goals/answer` → Siri reads next question → user answers
7. After 5-6 questions, API returns generated goals
8. Siri reads them, user says "accept" or "shuffle"
9. Shortcut hits `POST /api/goals/confirm`

### Network Requirements
- Next.js binds `0.0.0.0:3000` for local network access
- iPhone and Mac on same WiFi
- Mac local IP shown in `/settings` for easy Shortcut configuration
- All voice endpoints return plain text (not JSON) for direct Siri TTS consumption

## Error Handling

- **OpenAI API failure**: If plan generation fails (rate limit, network), retry up to 3 times with exponential backoff. If still failing, send an iMessage/email: "Couldn't generate today's plan — OpenAI is down. Open the app to create a manual plan." The app shows yesterday's carried-forward tasks as a fallback.
- **Weather API failure**: Show "Weather unavailable" in the plan. Non-blocking — plan generation continues without weather.
- **iMessage failure**: Fall back to email. If both fail, log the error — the plan is still in the app and `.md` file.

## Setup Instructions (included in app)

### First Run
1. Copy `.env.example` to `.env.local`, fill in `OPENAI_API_KEY`, `WEATHER_API_KEY`, `RESEND_API_KEY`
2. `npm install` → `npx prisma db push` → `npm run dev`
3. Open `localhost:3000/settings`
4. Enter phone number and email
5. Set recurring events
6. Set weekly goals via `/week`

### Apple Shortcut: "My Day" (morning alarm)
1. Create Shortcut → Get Contents of URL → `http://<mac-ip>:3000/api/today/voice`
2. Speak Text → (result from previous action)
3. Automations → When Alarm Is Stopped → Run "My Day"

### Apple Shortcut: "Set My Week" (voice goal setup)
1. Create Shortcut with Dictate Text → POST to `/api/goals/setup`
2. Repeat loop: Speak Text → Dictate Text → POST to `/api/goals/answer`
3. When response contains "goals:" → Speak Text → Dictate Text → POST to `/api/goals/confirm`
