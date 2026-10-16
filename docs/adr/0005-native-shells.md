# ADR 0005 — Native store shells via Capacitor 7

- Status: accepted · Date: 2026-10-16

## Decision
Wrap the PWA build (`dist/`) with **Capacitor 7** for iOS and Android. Native projects live in
`ios/` and `android/` and are committed (minus build outputs, per Capacitor's own .gitignores).
Native haptics come from `@capacitor/haptics`, bridged in `src/platform/native.ts` (web: no-op).

## Why Capacitor 7, not 8
Capacitor 8 requires Node ≥ 22; this machine and CI use Node 20. 7.x is current-supported and
upgrading later is a `npx cap migrate`.

## Notes / gotchas
- Xcode on this machine supports iOS ≥ 15; the template targets 14. Raised to 15.0 in the app
  project and forced for Pods in `ios/App/Podfile` post_install.
- `appId` is a placeholder (`com.example.atoll`) — **must be replaced** with the owner's id.
- Verified: iOS Simulator (iPhone 17) build + launch + screenshot. That run found a real bug: the
  safe-area inset probe read 0 at startup in WKWebView, so the score sat under the Dynamic Island.
  Fixed with a persistent probe + ResizeObserver.
- Android project generated but **not built**: no Android SDK on this machine.

## Workflow
`npm run build && npx cap sync` then open `ios/App/App.xcworkspace` in Xcode or `android/` in
Android Studio. `make ios-sim` builds and launches the simulator app.
