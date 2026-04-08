# Day Planner

Day Planner is a multi-page Next.js app for weekly goals, generated daily plans, recurring constraints, weather-aware voice summaries, and weekly review. This branch targets a hosted deployment: PostgreSQL for persistence, email delivery through Resend, and authenticated cron endpoints for an external scheduler.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Prisma 6
- PostgreSQL
- OpenAI
- WeatherAPI
- Resend

## Main Routes

- `/`
  Today view with the generated plan, recurring events, streak, weather, and task list
- `/week`
  Weekly goal management and AI-assisted goal setup
- `/history`
  Past plans and completion summaries
- `/history/[date]`
  Read-only day detail
- `/review`
  Weekly reflection and carry-forward view
- `/settings`
  Reminder schedule, timezone, recurring events, and cron endpoint reference

## Required Environment Variables

Copy `.env.example` and fill in:

```bash
DATABASE_URL="postgresql://..."
APP_BASE_URL="https://your-app.vercel.app"
CRON_SECRET="replace-with-a-long-random-string"
OPENAI_API_KEY="..."
WEATHER_API_KEY="..."
RESEND_API_KEY="..."
```

Notes:

- `DATABASE_URL` must point at PostgreSQL on this branch
- `APP_BASE_URL` is used to build links in reminder emails
- `CRON_SECRET` protects `/api/cron/[job]`
- missing external keys degrade those features instead of crashing the build

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Push the Prisma schema to your database:

```bash
npx prisma db push
npx prisma db seed
```

3. Start the app:

```bash
npm run dev
```

4. Run the verification loop before shipping:

```bash
npm test
npm run lint
npm run build
```

## Scheduler Setup

This branch does not run a local `node-cron` worker. Schedule an external service such as `cron-job.org` to call these routes on your deployed app:

- `GET /api/cron/morning`
- `GET /api/cron/midday`
- `GET /api/cron/evening`
- `GET /api/cron/weekly-review`

Authenticate each request with one of:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`
- `?key=<CRON_SECRET>`

## Deployment Notes

- Deploy the app to Vercel
- Provision PostgreSQL separately, for example through Supabase
- Add the same environment variables in Vercel
- After the first deployment, run `npx prisma db push` against the hosted database before using the app
