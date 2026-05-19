#!/usr/bin/env bash
# Build DayPlanner.app with the Developer ID Application identity so Siri /
# Spotlight properly index its App Intents. xcodebuild's "platform=macOS"
# destination defaults to "Sign to Run Locally" when it can't satisfy a
# strict signing config, so we pass everything explicitly here.
#
# Usage:
#   ./scripts/build-signed.sh                  # build only
#   ./scripts/build-signed.sh --install        # build + copy to /Applications
#   ./scripts/build-signed.sh --install --run  # build + install + launch

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TEAM_ID="NJ4J626ZPF"
IDENTITY="Developer ID Application: Zhengxiang Lyu (${TEAM_ID})"
APP_NAME="DayPlanner"

# Make sure project file is up to date with project.yml
if command -v xcodegen >/dev/null 2>&1; then
    xcodegen generate >/dev/null
fi

echo "Building ${APP_NAME} with ${IDENTITY}…"
# OTHER_CODE_SIGN_FLAGS=--timestamp=none avoids a timestamping handshake
# with Apple's servers that occasionally hangs and triggers a fall-back
# to "Sign to Run Locally". -destination must include arch=arm64 (or
# x86_64) explicitly — bare "platform=macOS" sometimes lets xcodebuild
# pick a destination whose default signing config is ad-hoc.
xcodebuild build \
    -project "${APP_NAME}.xcodeproj" \
    -scheme "${APP_NAME}" \
    -destination "platform=macOS,arch=arm64" \
    CODE_SIGN_IDENTITY="${IDENTITY}" \
    DEVELOPMENT_TEAM="${TEAM_ID}" \
    CODE_SIGN_STYLE=Manual \
    OTHER_CODE_SIGN_FLAGS="--timestamp=none" \
    2>&1 | grep -E "Signing Identity|error:|BUILD" | tail -10

DERIVED_APP=$(find ~/Library/Developer/Xcode/DerivedData \
    -path "*/Debug/${APP_NAME}.app" -type d 2>/dev/null | head -1)

if [[ -z "${DERIVED_APP}" ]]; then
    echo "error: could not locate built app under DerivedData" >&2
    exit 1
fi

echo "Built: ${DERIVED_APP}"
codesign -dv "${DERIVED_APP}" 2>&1 | grep -E "TeamIdentifier|Authority" | head -3

INSTALL=false
RUN=false
for arg in "$@"; do
    case "${arg}" in
        --install) INSTALL=true ;;
        --run)     RUN=true ;;
    esac
done

if ${INSTALL}; then
    echo "Installing to /Applications/${APP_NAME}.app…"
    pkill -x "${APP_NAME}" 2>/dev/null || true
    sleep 1
    rm -rf "/Applications/${APP_NAME}.app"
    cp -R "${DERIVED_APP}" /Applications/
    LSREG=/System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister
    "${LSREG}" -f -R "/Applications/${APP_NAME}.app" || true
    echo "Installed and registered."
fi

if ${RUN}; then
    echo "Launching /Applications/${APP_NAME}.app…"
    DAYPLANNER_DEMO_MODE=true "/Applications/${APP_NAME}.app/Contents/MacOS/${APP_NAME}" \
        >/tmp/dayplanner.signed.out 2>&1 &
    sleep 2
    pgrep -fl "${APP_NAME}" | head -1
fi
