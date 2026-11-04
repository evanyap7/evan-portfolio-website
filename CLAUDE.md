# Agent instructions

## Deterministic check (backpressure)
Before saying a task is done, or committing, run `npm run check` (JS syntax for `js/`, `tests/`) and
read its output. If it fails, fix the cause; never skip hooks (`--no-verify`). Report the actual result.

For changes to behaviour or layout also run `npm run check:browser` (headless Chrome, 7001 checks,
about 8.5 minutes). It is not in the pre-commit hook because of its runtime. CI runs it too, but as
report-only (`continue-on-error`), so a green CI run does not mean it passed: read the step's log, and
run it locally before saying a behaviour or layout change is done. Its failures were once random
under load (a dropped script request); if a check fails, read the "failed requests" lines it prints
before assuming the page is broken. The main-page checks in `tests/run.js` ALL rely on their order:
run alone, `callouts` reads the reactor's callouts before they are placed and fails, so rerun a
subset in ALL's order before calling a failure real.

Hooks install with `npm install` (husky `prepare`). The pre-commit hook also runs a gitleaks secret
scan on staged changes when gitleaks is installed (`brew install gitleaks`).
