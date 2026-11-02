# CV replacements (audit task W1, 2026-11-03)

The CV is the Google Doc "Evan's_CV with availabilities", tab **Current CV**.
These edits are to be made by hand: the one-page limit can only be checked in
the Doc itself. After editing, export it as PDF and replace
`resume/Evan-Yap-Resume.pdf` in this repo.

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

### 2. Univers, bullet 1 (decision D17)

- Before: Deployed an ESG research and claim-verification agent (Next.js,
  TypeScript, Vercel AI SDK, Groq) that answers only from retrieved web pages and
  PDFs, producing cited facility briefs and VERIFIED, REFUTED or UNVERIFIED
  verdicts.
- After: Deployed a retrieval-grounded ESG research and claim-verification agent
  (Next.js, TypeScript, Vercel AI SDK, Groq): it answers only from retrieved web
  pages and PDFs, producing cited facility briefs and VERIFIED, REFUTED or
  UNVERIFIED verdicts.

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

### 6. Technical Skills (decision D17)

- Before: **Engineering:** pytest, GitHub Actions CI, idempotency, audit
  logging, serverless deployment (Vercel)
- After: **Engineering:** Git/GitHub, pytest, GitHub Actions CI, idempotency,
  audit logging, serverless deployment (Vercel)

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
| QUANT CV, Extra Projects | "\~6,500-line" | "\~7,500-line" (7,518 lines) |
| Extra Projects | "About 24,000 lines of TypeScript" | "About 26,500" |
| Extra Projects | "Dec 2025 – Mar 2026" (Dragon Tiles) | "Sept 2025" (D3) |
| Extra Projects | "saves \~3 hours of research per facility audit" (research agent) | remove (D1) |
| QUANT CV, Z.ai CV | "approved-research-agent" link | update once the rename to ai-research-agent is done (D10) |

## The PDF in this repo

`resume/Evan-Yap-Resume.pdf` is still the old export: its mailto link is
`evan_yap@mymail.sutd.edu.sg`. Replace it with a new A4 export after making the
edits above. It has not been regenerated here, because it has to come from the
Doc you edit.
