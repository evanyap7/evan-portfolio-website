# GitHub project updater: design (DRAFT for review, not committed)

## Intent
Evan's portfolio should stay current without manual work. When a new GitHub repo appears, or an existing
project repo changes meaningfully, a draft site update is prepared automatically. Evan approves it through
EGO (his Telegram assistant) before anything goes live.

## Goals
- New repo -> full case-study page (like `work/assistant-bot.html`) + a card in `index.html` `work__grid`.
- Meaningful change to an existing project repo -> proposed edit to that project's page/card.
- Nothing publishes without an explicit Approve from Evan in Telegram.
- Every draft passes the existing gates (`npm run check`, then `check:browser`) before Evan is asked.
- Every number or claim in a draft is flagged "from README, unverified" so Evan checks it before approving.

## What a new project gets (confirmed by Evan: "new iron suit, new everything, like EGO")
Each project is a full Mark, not just a page. Reading the site, EGO's treatment is:
1. **A new Mark entry** in `js/marks.js`: numeral, name, role, `hue`, `colours`, paint name, three `chips`,
   `blurb`, three-part `line`, `sub`, `rows`, `stack`, `links`.
2. **A new suit** in `js/hall.js` `SUITS` and `js/marks.js` `spec`: one of the existing base models in
   `models/hall/` (`mark-1`, `mark-7`, `mark-7-lite`, `mark-50`) repainted with a project-specific
   `base`/`accent` colour pair, `metal`, `rough`, and optionally a chest badge.
3. **An art plate** `img/art/<slug>.svg`, drawn from the project's own material, plus a `focus` crop point
   for narrow screens.
4. **Registry wiring** in `js/projects.js` `SLUGS` (and `still` where used).
5. **A card** in `index.html` `work__grid` and a **case-study page** `work/<slug>.html`
   (`work/assistant-bot.html` is the template).
6. **Test updates**: `tests/checks.js` hard-codes "seven Marks" (`buttons.length === 7`), so every new Mark
   needs that count (and anything else keyed to the Mark list) updated in the same PR.

Choices the generator makes, always shown to Evan for approval, never silently final:
- Base model: picked from the four available, avoiding the one used by the neighbouring Mark.
- Colours: derived from the project's identity (language/brand/theme in the README), like Parallel Match's
  United red/black. The palette name and hex values are printed in the approval message.
- Art plate: generated as an SVG by Claude from the README's material, same style rules as the existing
  seven. Review needs a visual check (preview link plus a screenshot sent in Telegram).
- Mark order: the next numeral is appended; "Other builds" (VII) is currently the catch-all and last.
  Where a new Mark goes is Evan's call at approval time.

## Non-goals
- Auto-publishing with no approval.
- Rewriting the site's design, layout or hero.
- Moving the site off static HTML/Vercel.
- Replacing hand-written copy Evan already verified (STEP scholarship, 476+ tests, 38/39, etc.).

## Anti-goals (failure even if it "works")
- An invented metric, award or claim reaches the public site.
- A private repo, fork, or archived repo is exposed.
- A noisy stream of approval pings for trivial commits.

## Constraints
- Site: static HTML, Vercel, no backend. CI runs on PRs; the browser suite is report-only in CI, so it
  must be run and read, not assumed green.
- Project lists are hand-authored in `index.html`, `work/*.html`, `case-studies/`, and `js/marks.js` /
  `js/projects.js`. The generator must follow those templates exactly.
- EGO (`evanyap7/telegram-personal-assistant`) is Next.js/TS on Vercel with Telegram, cron and webhook
  routes. Its `lib/pending-actions.ts` stores approvals in a Google Sheet with a 5-minute expiry, which is
  too short for a draft review.
- Evan is sole commit author: no Co-Authored-By trailers on anything the pipeline commits.

## Approaches considered
- **A. GitHub Action in the portfolio repo, EGO as approval gate (chosen).** Draft goes to a PR with a Vercel
  preview; EGO asks Evan; Approve merges. Reuses the PR, preview and CI gates; EGO's role stays small.
- B. EGO does everything (webhook, drafting, commit). One system, but it moves quality gates into a bot and
  needs write access to the site repo. Rejected as riskiest.
- C. Local `/add-project` skill, no automation. Safe but not automatic and not EGO-integrated. Rejected.

## Design (approach A)

### Flow
1. **Detect.** A scheduled GitHub Action (daily) plus an optional manual `workflow_dispatch` lists
   `evanyap7` public, non-fork, non-archived repos and compares against `tools/projects-state.json`
   (repo, last-seen pushed_at, last-seen README hash, page slug). Webhooks are a later upgrade; polling needs
   no secrets on other repos.
2. **Classify.** New repo = not in state. Changed repo = already tracked AND (README hash changed OR a new
   release/tag OR large push since last seen). Pure chore commits are ignored.
3. **Draft.** A Claude step reads the repo README, languages, topics, and recent notable commits, then
   fills the case-study template and card markup. Output goes to branch `auto/project-<slug>`. Claims
   come only from the repo text; each numeric claim is listed in a generated `DRAFT-CLAIMS.md` (not published)
   with its source line.
4. **Gate.** The Action runs `npm run check` and `npm run check:browser`, reads the result, and fails the
   draft if either fails. A failing draft opens no approval request and notifies Evan of the failure only.
5. **PR + preview.** Open a PR (Vercel preview URL), body lists unverified claims. Commits authored as
   Evan, no attribution trailers.
6. **Ask EGO.** The Action POSTs a signed "draft ready" request to a new EGO route (`/api/portfolio-draft`)
   with repo, type (new/changed), PR URL, preview URL and the unverified-claims list.
7. **Approve in Telegram.** EGO sends a message with inline buttons: Approve / Reject / Open preview.
   The pending request is stored with a long expiry (7 days), separate from the 5-minute pending actions.
8. **Resolve.** EGO calls back the GitHub API: Approve merges the PR (Vercel deploys main); Reject closes it
   and records the repo as "skipped" so it is not re-proposed until it changes again.

### Security
- EGO route verifies an HMAC signature from the Action; Action verifies EGO's callback with a fine-grained
  GitHub token limited to the portfolio repo (contents + pull requests) stored as an EGO secret.
- Only Evan's Telegram user id can approve (EGO already restricts to him; confirm in build).
- Repo filter: public, non-fork, non-archived, plus an allow/deny list in `tools/projects-config.json`.
- Draft generation never reads private repos or secrets; the README is treated as untrusted text (prompt
  injection): it can fill copy fields but cannot change instructions, files touched, or links outside an
  allowlist.

### Components
- Portfolio repo: `.github/workflows/project-updater.yml`, `tools/updater/` (detect, classify, draft,
  template fill, Mark/suit generator, SVG art-plate generator, test-count updater, screenshot step),
  `tools/projects-state.json`, `tools/projects-config.json`.
- EGO repo: `app/api/portfolio-draft/route.ts`, a pending-draft store, Telegram button handlers, GitHub merge
  or close call.

### Rollout
1. Dry-run mode: detect + draft + PR, no EGO ping; Evan reviews a few drafts by hand.
2. Wire EGO approval.
3. Turn on the daily schedule.
4. Later: webhook-triggered instead of polling.

## Left to the builder
- Exact "meaningful change" thresholds, Claude model choice and prompt wording, state-file schema, Telegram
  message copy, how the card thumbnail/figure is chosen when the repo has no image.

## Decisions I made for Evan to check
- Daily polling instead of webhooks (simpler, no per-repo setup).
- Public, non-fork, non-archived repos only.
- 7-day approval expiry; an expired draft stays an open PR and is re-pinged once.
- Changed-repo updates edit existing pages via PR and never overwrite hand-verified numbers: they only
  propose a diff.
- The Action runs on GitHub's runners and needs an Anthropic API key secret (cost: roughly one model call
  per detected change).

## Open questions for Evan
0. A new Mark's art plate and colours are generated, so quality varies. If the preview looks wrong, should
   "Edit" in Telegram let you reply with a note ("make it blue", "use mark-50") that regenerates the draft?
   (My default: yes, up to 3 regenerations per draft.)
1. A new repo has no screenshot. The art plate is generated from README text, so no image is needed; keep
   that, or skip drafts for repos without a screenshot?
2. Should changed-repo drafts be allowed to alter figures like "38/39", or only prose?
3. OK to put an Anthropic API key and the GitHub token as GitHub/EGO secrets?
