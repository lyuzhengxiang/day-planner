#!/usr/bin/env bash
# Installs the DayPlanner LaunchAgent so the app starts at login and is
# re-launched if it exits unexpectedly. Run after copying DayPlanner.app to
# /Applications (or wherever).
#
# Usage:
#   ./install-agent.sh [/path/to/DayPlanner.app]
#
# Default app path is /Applications/DayPlanner.app.

set -euo pipefail

APP_PATH="${1:-/Applications/DayPlanner.app}"
LABEL="com.lyuzhengxiang.dayplanner"
AGENT_DIR="$HOME/Library/LaunchAgents"
AGENT_PLIST="$AGENT_DIR/$LABEL.plist"
TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$TEMPLATE_DIR/$LABEL.plist"

if [[ ! -d "$APP_PATH" ]]; then
    echo "error: DayPlanner.app not found at $APP_PATH" >&2
    echo "Pass the app path as the first argument or copy the app to /Applications first." >&2
    exit 1
fi

if [[ ! -f "$TEMPLATE" ]]; then
    echo "error: template plist not found at $TEMPLATE" >&2
    exit 1
fi

mkdir -p "$AGENT_DIR"

# Substitute {{APP_PATH}} -> resolved absolute path.
sed "s|{{APP_PATH}}|$APP_PATH|g" "$TEMPLATE" > "$AGENT_PLIST"

# Bootout (idempotent — silently no-op if not loaded) then bootstrap.
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENT_PLIST"

echo "Installed $AGENT_PLIST"
echo "Run 'launchctl print gui/$(id -u)/$LABEL' to verify."
