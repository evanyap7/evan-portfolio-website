# CV replacements (audit task W1, 2026-11-03)

The CV is the Google Doc "Evan's_CV with availabilities", tab **Current CV**.

**Applied on 2026-11-03.** The Current CV tab now has these edits, is A4 and
fits one page. Differences from the list below:
- The open [EVAN] questions were left unanswered, so the claims were cut: the
  "$4k monthly revenue" phrase is gone, "halved" became "cut", and the research
  agent bullet has no usage figure. The HVAC bullet keeps its wording, plus
  "effort".
- The test count is 212 (the trading branch with T4 merged), written as
  "212 tests in CI" to keep the line short.
- Awards and Leadership are one section below Education. The positioning line
  reads "Builds AI agents and measures whether they work. Seeking AI / software
  internships."
- `resume/Evan-Yap-Resume.pdf` is page 1 of an export from a temporary copy with
  the phone number removed.

Page setup to keep: **A4**, **0.5" margins** on all sides, Jake Ryan layout,
**exactly one page**. Each edit below is roughly length-neutral; check the page
count after the last one.

Every number below was checked against the repos on 2026-11-03.

## Current CV tab: before → after

### 1. Header (decision D4)

- Before: `evan_yap@mymail.sutd.edu.sg` · `Portfolio (http://www.evanyap.com)`
- After: `evanyap7@gmail.com` · `Portfolio (https://www.evanyap.com)`

Update the mailto link as well as the visible text. The phone number is
unchanged; whether it stays is up to you.

### 2. Univers, bullet 1 (decision D17 and plan section 4.3)

- Before: Deployed an ESG research and claim-verification agent (Next.js,
  TypeScript, Vercel AI SDK, Groq) that answers only from retrieved web pages and
  PDFs, producing cited facility briefs and VERIFIED, REFUTED or UNVERIFIED
  verdicts.
- After: Built and deployed a retrieval-grounded ESG research agent for energy
  and decarbonisation consultants (Next.js, TypeScript, Vercel AI SDK, Groq): it
  answers only from retrieved pages and PDFs and returns cited facility briefs or
  VERIFIED / REFUTED / UNVERIFIED verdicts.
- [EVAN] If you have real usage (how many consultants used it, or how many
  facilities or claims were run), add it. If not, leave the bullet without an
  outcome; do not estimate one.

### 2b. Univers, bullet 3 [EVAN]

- Before: Modelled a client's HVAC energy consumption with a regression model,
  and scored AI and energy-management use cases on impact, telemetry
  availability and feasibility for the Senior Director and client stakeholders.
- After, only if you confirm the claim: Built a regression model of a client's
  HVAC energy consumption that estimated within 2–3 percentage points of
  observed consumption; scored AI and energy-management use cases on impact,
  telemetry availability, feasibility and effort for the Senior Director and
  client stakeholders.
- Before using the "2–3 percentage points" figure, know three things: the
  target variable, the error metric and the validation data. If you cannot
  answer them, keep the bullet as it is.

### 3. EGO, bullet 1 (tool count and routing eval)

- Before: Built an LLM orchestrator that routes each text, photo or voice
  message to 24 tools, including finance and workout sub-agents, so one message
  can chain actions ("log lunch and move my 3pm"); deterministic fast paths skip
  the model for commands.
- After: Built an LLM orchestrator that routes each text, photo or voice message
  to 28 tools, including finance and workout sub-agents, so one message can
  chain actions ("log lunch and move my 3pm"); 97% routing accuracy (38/39) on
  my own eval set.

Evidence:
- `buildEgoTools()` returns 28 tools at telegram-personal-assistant `5352d1c`:
  24 intent actions, plus askFinanceAgent, askWorkoutAgent, webSearch and
  processPendingImage.
- `eval:ego` was re-run on 2026-11-03 and scored 38/39.

### 4. EGO, bullet 3 (sync-time benchmark)

- Before: …parallel parsing cut sync time \~75% vs a sequential baseline.
- After: …parallel parsing cut sync time \~74% vs a sequential baseline.

Evidence: `bench:parallel` was re-run on 2026-11-03 with 6 receipts and
3 runs. The runs gave 72.6%, 70.6% and 80.0%, a mean of about 74%.

### 5. Systematic Trading System, bullet 2 (test count)

- Before: …191 tests run in GitHub Actions CI.
- After: …209 tests run in GitHub Actions CI.

Evidence: `uv run pytest` gives 209. `.github/workflows/ci.yml` exists. The
2% daily-loss stop and 5% drawdown breaker match `config/risk_limits.yaml`.

### 5b. Systematic Trading System, bullet 3 (task T2: the "four ideas" framing)

The current wording counts the Claude test twice: it is one of the four ideas,
then gets mentioned again on top. The README and the site count four ideas:
- the Claude agent;
- the classic quant signals;
- insider buying;
- the momentum rule, which matches SPY rather than failing.

- Before: Validated strategies with a walk-forward harness (no-look-ahead tests,
  deflated Sharpe with trial counting): four studies found no edge, and a Claude
  screening layer that missed its pre-set bar (win rate 43.9% vs 47.4%) was
  removed.
- After: Tested four ideas with a walk-forward harness (no-look-ahead test,
  deflated Sharpe with trial counting): none beat the index, and a Claude
  screening layer that missed its pre-set bar (win rate 43.9% vs 47.4%) was
  removed.

### 6. Technical Skills (decision D17)

- Before: **Engineering:** pytest, GitHub Actions CI, idempotency, audit
  logging, serverless deployment (Vercel)
- After: **Engineering:** Git/GitHub, pytest, GitHub Actions CI, idempotency,
  audit logging, serverless deployment (Vercel)

### 7. Optional, only if the page still fits

- A positioning line under the contact block: "SUTD sophomore who builds AI
  agents and measures whether they work. Seeking AI / software engineering
  internships."
- Move Awards (Top 5 of 100; 2nd Place, Vietnam Grand Challenge) up to just
  below Education, where a six-second scan will catch them.

### Checked and left as they are

- Parallel Match: "137 Python tests" (137 `def test_` in `tests/`) and
  "18-language" (README) are correct. No result is claimed, as decision D16
  requires.
- Trading: "live trading paused since 1 Oct 2026" matches the repo README.
- Awards: Top 5 of 100 (Sep 2026) and 2nd Place, Vietnam Grand Challenge
  (May 2026).

## Needs your answer [EVAN]

- **EvanYapFitness: "a sustained $4k monthly revenue".** Under D5 this stays
  off the site, so it appears only on the CV. Is "sustained" accurate, and over
  what period? If not, cut the bullet to "Grew an online coaching business to
  30 paying clients in total; …".
- **EvanYapFitness: "halved programming time per client".** Nothing records how
  this was measured. Keep it only if you can explain it in an interview, for
  example "about 2 hours down to about 1 per client". Otherwise use "cut
  programming time per client".

- **EGO: who uses it.** The Extra Projects tab calls it a "Production Telegram
  assistant". If it is in daily use by you alone, say "in daily personal use"
  or "single-user".
- **Leadership: scale.** Add the team size or scope to "Floorball Captain;
  House Exco" if you know it. Otherwise it reads as filler.

## Stale text in the other tabs

Fix these only if you still send these versions.

| Tab | Stale | Fix |
| --- | --- | --- |
| Old CV, QUANT CV, Z.ai CV | `evan_yap@mymail.sutd.edu.sg` | `evanyap7@gmail.com` (D4) |
| Old CV, QUANT CV, Z.ai CV | "Project V-Bây" / "(V-Bây)" | "V-Bẫy" (D2) |
| Old CV, QUANT CV, Extra Projects | "\~3 hours per facility audit" | remove (D1) |
| Old CV | "1% daily-loss breaker" | "2% daily-loss stop" (`risk_limits.yaml`) |
| Old CV | "1.42 Sharpe and 61% return" (momentum backtest) | remove; the repo notes these came from a different window. The current figures are +66.8% vs SPY +70.1%, Sharpe 0.98 vs 0.74 over 2022–26 |
| Old CV | "Aug 2026 - Oct 2026" (bot) | "Aug 2026 – Present" |
| Old CV | "\~77%" sync time | "\~74%" |
| Old CV | "29 Zod-validated intents at 100% eval accuracy and \~65% lower cost per call" | "97% routing accuracy (38/39)"; drop the cost figure (it was not re-measured for the chain) |
| Old CV | Gemini Flash-Lite → 3.6 Flash → Sonar intent tiers | Claude Haiku → Sonnet → Opus; Gemini now handles voice only |
| QUANT CV, Z.ai CV, Extra Projects | "24 tools" | "28 tools" |
| QUANT CV, Z.ai CV, Extra Projects | "97% (34/35)" / "35-case live eval set" | "97% (38/39)" / "39-case eval set" |
| QUANT CV, Extra Projects | "Aug – Oct 2026" (bot) | "Aug 2026 – Present" |
| QUANT CV, Extra Projects | "191 tests" | "209 tests" |
| Extra Projects, QUANT CV | "Four studies, each published…, say no" / "ran 4 studies… none found an edge" | the "four ideas" framing from 5b |
| QUANT CV, Extra Projects | "\~6,500-line" | "\~7,500-line" (7,518 lines) |
| Extra Projects | "About 24,000 lines of TypeScript" | "About 26,500" |
| Extra Projects | "Dec 2025 – Mar 2026" (Dragon Tiles) | "Sept 2025" (D3) |
| Extra Projects | "saves \~3 hours of research per facility audit" (research agent) | remove (D1) |
| QUANT CV, Z.ai CV | "approved-research-agent" link | "ai-research-agent" (renamed on 2026-11-03, D10; the old URL redirects) |

## The PDF in this repo

`resume/Evan-Yap-Resume.pdf` was replaced on 2026-11-03 with the edited Current
CV tab: one A4 page, mailto `evanyap7@gmail.com`, no phone number. To refresh it
later, copy the Doc, delete the phone number in the copy, export page 1 as PDF,
then trash the copy.
