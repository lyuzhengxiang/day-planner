#!/usr/bin/env bash
# Removes the DayPlanner LaunchAgent.
set -euo pipefail

LABEL="com.lyuzhengxiang.dayplanner"
AGENT_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$AGENT_PLIST"

echo "Removed $AGENT_PLIST"
