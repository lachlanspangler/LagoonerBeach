#!/bin/sh
# Build the iOS app for the first available iPhone simulator, launch it, and screenshot it.
set -e
SIM=$(xcrun simctl list devices available | grep -E "iPhone" | head -1 | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug \
  -destination "id=$SIM" -derivedDataPath /tmp/atoll-dd CODE_SIGNING_ALLOWED=NO build | tail -1
xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl bootstatus "$SIM" -b >/dev/null
xcrun simctl install "$SIM" /tmp/atoll-dd/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$SIM" com.example.atoll
sleep 5
mkdir -p artifacts/shots
xcrun simctl io "$SIM" screenshot artifacts/shots/ios-sim.png
echo "screenshot: artifacts/shots/ios-sim.png"
