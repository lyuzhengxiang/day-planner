# Day Planner

A proactive, voice-integrated daily planning app for macOS. Generates the day's
task list before you wake up, texts it to you via iMessage, and reads it aloud
through Siri.

Built and iterated weekly:

| Version | Week | Focus |
|---|---|---|
| v1 | 6 | First runnable web app — Next.js + Prisma + SQLite + OpenAI |
| v2 | 7 | All API routes, full UI, cron-driven plan generation, markdown export |
| **v3** | **8 (current)** | **Native macOS rewrite + security pass** |
| v4 | 9 | Project fair |

## Where v3 work lives

This `main` branch holds the v2 Next.js codebase, hardened by the v3 security
pass (prompt-injection defenses, secrets template, structured logging, CI, supply chain, threat model).

The v3 **iteration** — a native macOS rewrite in SwiftUI + SwiftData — lives on
[**`change-to-xcode`**](https://github.com/lyuzhengxiang/day-planner/tree/change-to-xcode).
That's where active development happens. Click through to see ~1900 lines of
Swift across 8 SwiftData models, 12 services, and a passing test suite.

```
graders → main           ← Next.js v2 + v3 security pass (this branch)
        → change-to-xcode ← v3 native macOS rewrite (active)
```

## v3 security highlights (this branch)

- **Secrets**: `.env.example` template committed; real `.env` gitignored. The
  macOS rewrite uses the system Keychain instead of dotfiles.
- **AI inputs**: every user-controlled string going into an OpenAI prompt is
  length-capped, whitespace-normalized, and wrapped in delimited XML-style
  blocks. The system prompt explicitly disclaims instructions found inside
  those blocks. See [`src/lib/prompt-safety.ts`](src/lib/prompt-safety.ts) +
  [`tests/lib/prompt-safety.test.ts`](tests/lib/prompt-safety.test.ts) (9 tests).
- **Supply chain**: all **high-severity** Next.js advisories from v2 resolved
  by bumping to 16.2.6. `.github/dependabot.yml` watches npm + Actions weekly.
- **CI gates**: `.github/workflows/ci.yml` runs lint + test + build + `npm
  audit --audit-level=high` on every push and PR.
- **Monitoring**: a tiny structured-JSON logger
  ([`src/lib/logger.ts`](src/lib/logger.ts)) with built-in redaction of
  `apiKey` / `token` / `phone` / `email` keys.
- **Threat model**: [`SECURITY.md`](SECURITY.md) documents scope, mitigations,
  known issues, and reporting.

## Stack (v2 / this branch)

Next.js 16.2.6 · React 19 · Tailwind 4 · Prisma 6 · SQLite · OpenAI (`gpt-5.4`)
· WeatherAPI · Resend · AppleScript via `osascript` · node-cron.

## Getting started

```sh
cp .env.example .env       # fill in OPENAI_API_KEY, WEATHER_API_KEY, RESEND_API_KEY
npm install
npx prisma db push         # creates prisma/dev.db
npm run dev                # http://localhost:3000
```

Then open `http://localhost:3000/settings`, enter your phone number and Mac
local IP, and trigger plan generation manually from `/`.

## Verification

```sh
npm test       # 25 tests including 9 prompt-injection defenses
npm run lint
npm run build
```

## Docs

- [`AGENTS.md`](AGENTS.md) — agent-facing project brief, data model, conventions
- [`SECURITY.md`](SECURITY.md) — threat model, mitigations, reporting
- [`docs/superpowers/specs/2026-04-01-day-planner-design.md`](docs/superpowers/specs/2026-04-01-day-planner-design.md) — original design spec
- [`docs/superpowers/plans/2026-04-01-day-planner.md`](docs/superpowers/plans/2026-04-01-day-planner.md) — v1/v2 implementation plan
