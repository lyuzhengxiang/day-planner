# Day Planner Cloud Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the local-first Day Planner into a Vercel-compatible web app backed by hosted Postgres, email-only notifications, and externally triggered cron routes.

**Architecture:** Keep the existing Next.js App Router and Prisma data access layer, but swap SQLite for PostgreSQL and replace in-process cron with authenticated Route Handlers that an external scheduler can call. Preserve the current product surface where possible, while removing local-only assumptions like AppleScript iMessage delivery and LAN URLs.

**Tech Stack:** Next.js 16, Prisma 6, PostgreSQL/Supabase, Resend, external scheduler (for example cron-job.org)

---

### Task 1: Add cloud runtime tests first

**Files:**
- Create or modify: `tests/config/database-path.test.ts`
- Create or modify: `tests/lib/planner.test.ts`
- Create or modify: `tests/lib/notifications.test.ts`
- Create or modify: `tests/lib/cron.test.ts`

- [ ] Add failing tests for PostgreSQL env expectations and cloud URL helpers.
- [ ] Add failing tests for cron route authorization.
- [ ] Add failing tests for email-only notification behavior.

### Task 2: Switch persistence and config to cloud defaults

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma.config.ts`
- Modify: `.env.example`
- Modify: `package.json`

- [ ] Change Prisma datasource to PostgreSQL.
- [ ] Add cloud env vars like `APP_BASE_URL` and `CRON_SECRET` to examples and docs.
- [ ] Remove local-only runtime dependencies that are no longer used in cloud mode.

### Task 3: Replace local cron and local notification assumptions

**Files:**
- Modify: `src/lib/notifications.ts`
- Modify: `src/lib/generate-plan.ts`
- Modify or replace: `src/lib/cron.ts`
- Delete or modify: `src/instrumentation.ts`
- Create: `src/lib/cron-auth.ts`
- Create: `src/app/api/cron/morning/route.ts`
- Create: `src/app/api/cron/midday/route.ts`
- Create: `src/app/api/cron/evening/route.ts`
- Create: `src/app/api/cron/weekly-review/route.ts`

- [ ] Remove in-process scheduling.
- [ ] Add authenticated cron endpoints for external schedulers.
- [ ] Make notifications email-only and build links from `APP_BASE_URL`.

### Task 4: Update the product surface for cloud semantics

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/components/SettingsForm.tsx`
- Modify: `src/components/FirstRunBanner.tsx`
- Modify: `prisma/seed.ts`

- [ ] Remove or downplay local Mac-specific fields and copy.
- [ ] Keep the settings model coherent for a deployed web app.

### Task 5: Update docs and verify

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Optionally create: `vercel.json`

- [ ] Document the Vercel + Supabase + Resend + external scheduler setup.
- [ ] Run `npm test`, `npm run lint`, `npx prisma generate`, and `npm run build`.
- [ ] If a local Postgres container is available, run a smoke test against it.
