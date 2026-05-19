# DayPlanner — macOS Native

Native macOS rewrite of the Day Planner. SwiftUI + SwiftData + AppKit, targeting macOS 14 Sonoma+.

This directory lives alongside the original Next.js codebase (kept as legacy reference). All future development happens here.

## Prerequisites

- macOS 14 Sonoma or later
- Xcode 15 or later
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — generates the `.xcodeproj` from `project.yml`
  ```
  brew install xcodegen
  ```
- Apple Developer account (for signing). Free tier works for local builds; paid ($99/year) needed for notarized distribution.

## First-time setup

```sh
# From repo root
cd macos

# Generate the Xcode project from project.yml
xcodegen generate

# Open in Xcode
open DayPlanner.xcodeproj
```

In Xcode:
1. Select the `DayPlanner` target → Signing & Capabilities tab
2. Set your Team to your Apple ID
3. Click "Run" (⌘R)

On first run you'll be prompted to grant Messages automation permission.

## API keys

DayPlanner reads three API keys from the macOS Keychain (managed via the in-app Settings screen):
- `OPENAI_API_KEY` — required for plan generation, goal flow, reflection
- `WEATHER_API_KEY` — required for weather; falls back to "Weather unavailable" if missing
- `RESEND_API_KEY` — optional; enables email as a fallback when iMessage fails

For initial development you can also set them as environment variables in the Xcode scheme's Run action (Edit Scheme → Arguments → Environment Variables).

## Project layout

```
macos/
├── project.yml                    # XcodeGen spec — the source of truth
├── DayPlanner/
│   ├── DayPlannerApp.swift        # @main entry
│   ├── Info.plist
│   ├── DayPlanner.entitlements
│   ├── Models/                    # SwiftData @Model classes (8 models)
│   ├── Services/                  # Headless business logic
│   ├── Views/                     # SwiftUI views (6 pages)
│   ├── Intents/                   # App Intents for Siri integration
│   ├── Resources/                 # quotes.json etc.
│   ├── Utilities/
│   └── Assets.xcassets/
└── DayPlannerTests/               # XCTest target
```

## Architecture

- **Models** — SwiftData `@Model` classes, mirrors the Prisma schema 1:1
- **Services** — protocol-oriented, dependency-injected, testable in isolation
- **Views** — SwiftUI, observe `@Model` directly via `@Query` / `@Bindable`
- **Intents** — `AppIntent` subclasses; Siri / Shortcuts / Spotlight pick them up automatically
- **Scheduling** — `PlanScheduler` uses `Timer` + day boundary recompute; runs in-process while the app is alive
- **Background presence** — `LSUIElement` toggled by user preference; app can live in the menu bar only

## Testing

```sh
# Via XcodeGen project
xcodebuild test \
  -project DayPlanner.xcodeproj \
  -scheme DayPlanner \
  -destination "platform=macOS"
```

## Distribution

v1 ships as a notarized DMG (no App Store). See `docs/distribution.md` (TBD) once we're closer to release.
