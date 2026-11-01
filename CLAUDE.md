# Agent instructions

## Deterministic check (backpressure)
Before saying a task is done, or committing, run `npm run check` (JS syntax for `js/`, `tests/`) and
read its output. If it fails, fix the cause; never skip hooks (`--no-verify`). Report the actual result.

For changes to behaviour or layout also run `npm run check:browser` (headless Chrome, 6415 checks,
about 5.5 minutes). It runs in CI, not in the pre-commit hook, because of its runtime.

Hooks install with `npm install` (husky `prepare`).
