# Security

This document captures the threat model, security posture, and reporting process
for Day Planner. It was authored as part of the **Project v3 security pass**
(Week 8) and is kept up to date as the codebase evolves.

## Status

Day Planner is currently a **single-user, local-first** macOS application.
The Next.js + SQLite codebase on `main` is what runs today; a native macOS
rewrite is in progress on the [`change-to-xcode`](https://github.com/lyuzhengxiang/day-planner/tree/change-to-xcode)
branch and inherits the same threat model with stronger primitives (Keychain
for secrets, hardened runtime, sandboxed network).

## Threat model

We deliberately scope the threat model narrowly because the app is local:

| Asset | Threat | Mitigation |
|---|---|---|
| OpenAI / Weather / Resend **API keys** | Disk leak (committed to git, dotfile sync, screenshots, swap) | `.env` is gitignored (`.gitignore: .env*`); `.env.example` is the only key-shaped file in source control. macOS rewrite stores keys in the system Keychain (`KeychainStore.swift`). |
| **Database** (`prisma/dev.db`) — goals, tasks, contact info | Filesystem disclosure to other local users | File lives under `prisma/` with default UNIX permissions. Multi-user OS users on the same machine are out of scope; document-level encryption is a future concern. |
| **AI inputs** — user-controlled text flows into OpenAI prompts | Prompt injection causing data exfiltration, escalation, or pollution of generated plans | All user-controlled fields (goal text, task text, recurring event titles, ad-hoc input) are bounded in length and wrapped in delimited blocks before being inserted into prompts. See `src/lib/prompt-safety.ts` (Next.js) and `Services/PromptSafety.swift` (macOS). |
| **macOS Automation** (AppleScript → Messages) | A compromised local process sends arbitrary iMessages from the user's account | First-launch macOS Automation permission dialog is the gating mechanism; the only buddy ever addressed is the one in `Settings.iMessagePhone`. |
| **Outbound network surface** | An attacker proxies / MITMs OpenAI / WeatherAPI / Resend traffic | All three endpoints are HTTPS; the OpenAI SDK and `fetch()` calls do not disable TLS verification. |
| **Build / supply chain** | A malicious transitive dependency lands a backdoor | Renovate is OOT for now; we use GitHub Dependabot (`.github/dependabot.yml`) and a CI gate that runs `npm audit` and surfaces high-severity advisories. `package-lock.json` is committed. |

Explicit **non-goals** for v3:

- Multi-user authentication. There is no login. The OS user is the app user.
- Cloud sync / multi-device. The macOS rewrite's `change-to-xcode` branch
  deliberately keeps data local, with a planned (not yet implemented) iCloud
  CloudKit layer behind a feature flag.
- Hardening against an attacker with local code execution. If they're already
  on your Mac, they win.

## Secrets management

| Where | How |
|---|---|
| Next.js (`main`) | `.env` file at repo root, read by `process.env`. Never committed (`.gitignore` enforces). `.env.example` documents the required keys. |
| macOS (`change-to-xcode`) | macOS Keychain via `KeychainStore.swift`. `kSecAttrService = com.lyuzhengxiang.dayplanner`. Env-var override is available for development (Xcode scheme → Run → Environment Variables) but never used in Release builds. |

Rotation is the user's responsibility — surface the API keys are kept in is
documented in the in-app Settings screen.

## Dev / prod separation

The Next.js codebase is **local-only**; there is no remote production
deployment to separate from. The macOS rewrite uses Xcode Debug vs Release
configurations:

| Aspect | Debug | Release |
|---|---|---|
| Keychain prefix | `com.lyuzhengxiang.dayplanner.debug` | `com.lyuzhengxiang.dayplanner` |
| LLM target | Optional `MockLLMService` (when `MOCK_LLM=1` env is set) | `OpenAIService` only |
| Logging level | `.debug` | `.info` and above |
| Markdown export | `~/Documents/DayPlanner-Debug/days/` | `~/Documents/DayPlanner/days/` |

## CI gates

GitHub Actions in `.github/workflows/`:

- `ci.yml` — runs on every push and PR: `npm ci`, `npm run lint`, `npm test`,
  `npm run build`, then `npm audit --audit-level=high` as a soft fail.
- `macos.yml` — runs on `change-to-xcode` branch only: `xcodegen generate`,
  `xcodebuild test` on a macOS-14 runner.

A failing high-severity advisory does not block merge yet — graded as warn-only
for v3 because we expect to land patches inside the same week.

## Supply chain

- `package-lock.json` is committed for deterministic installs.
- `.github/dependabot.yml` watches `npm` (root) and `github-actions` weekly.
- The macOS branch adds `swift` ecosystem to Dependabot for SwiftPM packages.
- Direct dependencies are minimal: `next`, `prisma`, `openai`, `resend`,
  `node-cron`, `date-fns`. We audited each by hand for v3.

## Monitoring

- Next.js: structured logging via `src/lib/logger.ts` (introduced in v3) —
  scopes API errors to a JSON line on stderr with the route and a redacted
  request payload.
- macOS: `os.Logger` with `subsystem = com.lyuzhengxiang.dayplanner` and a
  per-service category. API keys and phone numbers are formatted with the
  `.private` privacy specifier so they don't appear in Console.app captures.

## Known issues

| Issue | Status |
|---|---|
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — moderate XSS in PostCSS when stringifying untrusted CSS via `</style>` injection. Reaches us as a transitive dep of Next.js. | Tracked. Fix requires Next.js to bump its bundled PostCSS; `npm audit fix --force` would downgrade Next to 9.x and is rejected. We don't render user-supplied CSS, so the practical exposure is zero. |

All **high-severity** advisories present in `package-lock.json` at the start
of v3 (the Next.js 16.2.2 cluster: DoS via Server Components, App Router
middleware bypass, cache poisoning, etc.) have been resolved by bumping to
Next.js 16.2.6.

## Reporting

This is a coursework project, but if you find a real issue:

- Open a GitHub Security Advisory at
  <https://github.com/lyuzhengxiang/day-planner/security/advisories/new>, OR
- Email lyuzhengxiang@uchicago.edu.

Please don't open public issues for security problems.
