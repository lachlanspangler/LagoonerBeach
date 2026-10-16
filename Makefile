# One-command workflows. See CLAUDE.md for details.
.PHONY: setup dev build test e2e perf check tune ideas clean

setup:            ## install deps + browsers
	npm ci || npm install
	npx playwright install chromium

dev:              ## dev server on :5317
	npm run dev

build:            ## typecheck + production build into dist/
	npm run build

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
	rm -rf dist coverage test-results playwright-report artifacts/tmp
