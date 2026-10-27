# One-command workflows. See CLAUDE.md for details.
.PHONY: setup dev build test e2e perf check tune ideas clean

setup:            ## install deps + browsers
	npm ci || npm install
	npx playwright install chromium webkit
	git config core.hooksPath .githooks

dev:              ## dev server on :5317
	npm run dev

build:            ## typecheck + production build into dist/ (+ bundle budget)
	npm run build
	npm run size

test:             ## unit + property + balance tests
	npm test

e2e: build        ## browser tests (gameplay, screenshots, perf) against the production build
	npx playwright test

perf: build       ## only the frame-time budget test
	npx playwright test tests/perf

check:            ## everything CI runs (minus e2e)
	npm run check

tune:             ## bot balance report (artifacts/tune.json)
	npm run tune

ideas:            ## regenerate docs/IDEAS.md from the ledger
	npm run ideas

clean:
	rm -rf dist dist-e2e dist-debug coverage test-results playwright-report artifacts/tmp

ios-sim: build     ## build web, sync, build+launch on an iPhone simulator, screenshot
	npx cap sync ios
	./scripts/ios-sim.sh

# The debug bundle goes to dist-debug/ (never dist/), and one sync points at it; afterwards (pass or
# fail) the Android assets are copied back from the release dist/, so a later manual archive can't
# ship debug hooks or demo boards.
android-emu: build  ## debug APK (web build with debug hooks + demo boards) on a headless Android emulator, screenshot
	VITE_DEBUG=1 VITE_LB=demo npx vite build --outDir dist-debug --emptyOutDir --logLevel warn
	CAP_WEB_DIR=dist-debug ./scripts/android-emu.sh; s=$$?; npx cap copy android; exit $$s

android-release: build  ## signed release AAB + APK (needs android/keystore.properties; unsigned otherwise)
	npx cap sync android
	cd android && ./gradlew bundleRelease assembleRelease
	@echo "AAB: android/app/build/outputs/bundle/release/app-release.aab"
