#!/bin/sh
# Build the iOS app (Release, the release web bundle in dist/) for this project's own simulator,
# launch it, and screenshot it. The laptop is shared with other projects: we create and use a
# dedicated "Lagooner iPhone" simulator and never touch anyone else's (shut it down when done:
# `xcrun simctl shutdown "Lagooner iPhone"`).
set -e
NAME="Lagooner iPhone"
SIM=$(xcrun simctl list devices available | grep "$NAME (" | head -1 | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
if [ -z "$SIM" ]; then
  TYPE=$(xcrun simctl list devicetypes | grep -E "^iPhone 1[5-7] \(" | tail -1 | sed -E 's/.*\((com[^)]+)\).*/\1/')
  RT=$(xcrun simctl list runtimes available | grep -E "^iOS" | tail -1 | sed -E 's/.* - (com[^ ]+).*/\1/')
  SIM=$(xcrun simctl create "$NAME" "$TYPE" "$RT")
fi
CONF=${CONF:-Release}
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration "$CONF" \
  -destination "id=$SIM" -derivedDataPath /tmp/lagooner-dd CODE_SIGNING_ALLOWED=NO build | tail -1
xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl bootstatus "$SIM" -b >/dev/null
xcrun simctl install "$SIM" "/tmp/lagooner-dd/Build/Products/$CONF-iphonesimulator/App.app"
xcrun simctl launch "$SIM" com.example.atoll
sleep 6
mkdir -p artifacts/shots
xcrun simctl io "$SIM" screenshot artifacts/shots/ios-sim.png
echo "screenshot: artifacts/shots/ios-sim.png (sim $SIM)"
