# Minimal revamp: black, Visuvate-style, with project pages

Date: 2026-10-15
Branch: `revamp/minimal`, from `main-2` (not merged, pushed or deployed)

## Result

- Check page: **PASS 4129** in Chromium and **PASS 4129** in WebKit (Playwright 1.63). The total is large because the main page runs 16 checks at 13 sizes, and each of the six project pages (the case study included) runs 10 checks at the same 13 sizes.
- Console: clean (no errors, warnings or failed requests) on `index.html`, the five project pages and the case study, scrolled top to bottom.
- Lighthouse (mobile): accessibility, best practices and SEO all 100 on `index.html`, `work/assistant-bot.html` and the case study. Performance was not measured (the MCP tool does not run it).
- Reduce Motion (Playwright, `reducedMotion: 'reduce'`): `document.getAnimations().length` is 0 after load, after scrolling every page, after choosing every Toolkit tab and after hovering the cartoon, on all seven pages. Every counter shows its final value, nothing is left hidden and no diagram goes live.
- With motion: the cartoon does not wave until About is in view, then waves; counters run (for example `5|~38%|102|0–59|$206M|1` mid-way) and finish on the HTML's values; diagrams play on screen and the pause button stops every animation.
- Keyboard: skip link, wordmark, the five nav links and Resume all take focus with the 2px `--signal` ring; a work card takes focus and Enter opens its page; the tabs move with the arrow keys, Home and End, and Tab leaves to the panel; Enter on Copy copies the address; on a phone, Menu opens the menu, Tab goes straight to its first link, the page and footer behind are inert, and Escape closes it and returns focus to the button.

## What changed

The whole site is now black, minimal and in natural scroll: no drawing sheets, no one-screen rule.

- **Main page** (`index.html`, `css/home.css`): a near full-height centred hero; About with the waving cartoon in a card beside the statement and the three paragraphs; Experience as hairline rows (dates, who, points) with a compact Earlier group; Selected work as six cards tucked over a huge title, each one link to its own page; Toolkit with the four tabs as a segmented pill; Contact with a huge "Let's talk", the email and Copy pill, and Resume, GitHub and LinkedIn pills. A footer with © 2026 Evan Yap and a small wordmark.
- **Nav** (`css/layout.css`): a floating pill with a solid `#0a0a0a` background (no `backdrop-filter`), the wordmark, five links that mark the section on screen with a soft pill (`js/index.js`), and a solid Resume pill. Below 1024px: the wordmark and a Menu pill opening a full-screen menu (the old `js/menu.js`, which now makes the footer inert as well as `main`).
- **Project pages** (`work/*.html`, `css/project.css`): one template for website-revamp, assistant-bot, research-agent, v-bay and others. Each has the nav, "← All work", the mono label, the title with one serif word, a row of big figures that count up, the diagram (or the screenshot, or the piano and moon plate) in a large card, Overview, Stack and Links as hairline rows, and a large "Next project" card. The six run in a loop: website-revamp, assistant-bot, the case study, research-agent, v-bay, others, and back. Each page has its own `<title>` ("Project | Evan Yap"), description, canonical and og tags, and links work on the local server and on Vercel (absolute `/…` paths with `.html`).
- **Case study** (`case-studies/trading-agent.html`, `css/case-study.css`): on the same template, with the ledger diagram right under the figures, then the article unchanged, restyled for black. The model step in the pipeline is outlined in `--signal`, so "Blue marks the only step that was ever a model" stays true.
- **Diagrams** (`css/figures.css`, `js/reel.js`, `js/scenes.js`): the four reel SVGs moved from `index.html` into their pages. `reel.js` mounts a reel without a project panel: it plays while on screen and not paused, and keeps the pause button and clock. Plates are `#0a0a0a` with a `--line` border, rounded, with a faint white dot grid. Lines and boxes are `--muted`, text `--text`, notes `--muted`, and the moving and passing colour is `--signal`. Inline colours became role classes (`is-signal`, `is-signal-soft`, `is-fail`, `is-band`, `is-doc`, `stroke-signal`, `stroke-text`, `stroke-dim`), and the timelines read `--signal`, `--text` and `--muted` from the page.
- **Motion kept**: the hero's staggered rise on load (CSS); fade and rise reveals; count-up once when seen (`js/count.js`, now any `[data-count]`); the Toolkit panel fades and rises when shown; the cartoon's wave, now started when About first comes into view and replayed on hover or tap (`js/wave.js`); the blink; the scroll progress line, now a 2px white-at-50% line along the top of the screen; the diagrams; Others' one-off drawing, now played the first time its plate is seen.
- **Checks** (`tests/checks.js`, `tests/run.js`): rewritten. Same harness (iframes at the 13 sizes, try/catch per check, a load timeout). See the README for the list.
- **Other**: favicon is a black rounded square with a white rule; `theme-color` is `#000000` on every page; `img/og.jpg` recaptured from the new hero at 1200 × 630 (JPEG q85); a 120px avatar `img/evan-120.jpg` (7 KB) for the hero's tag pill; the README is rewritten.

### Files

- New: `css/home.css`, `css/project.css`, `work/website-revamp.html`, `work/assistant-bot.html`, `work/research-agent.html`, `work/v-bay.html`, `work/others.html`, `img/evan-120.jpg`, this file.
- Rewritten: `index.html`, `css/base.css`, `css/layout.css`, `css/figures.css`, `css/case-study.css`, `case-studies/trading-agent.html`, `js/main.js`, `js/index.js`, `js/count.js`, `js/wave.js`, `js/reveal.js`, `tests/checks.js`, `tests/run.js`, `README.md`, `img/og.jpg`.
- Edited: `js/reel.js`, `js/scenes.js`, `js/menu.js`, comments in `js/tabs.js`, `js/contact.js`, `js/config.js`.
- Deleted: `css/sheets.css`, `js/work.js`, `js/lean.js`.

## Removed

Drawing-sheet frames and paper; sheet labels ("04 Selected work") and their typing-in; the tick index and "0X / 06" counter; "Next:" links; title blocks; the hand-drawn underline; the Intro dot grid and lens; the cartoon's head lean (`lean.js`); tool marks in the project stacks (stacks are plain mono text; the Toolkit tab keeps its marks, in grey); the project tabs and accordion (`work.js`) and their checks; the one-screen fit checks; the "Fig. 4.x" numbering; the diagrams' corner brackets; Switzer and Fragment Mono; the About photo (the photo now appears only as the small round avatar in the hero's tag pill).

## Copy for your sign-off

No facts or figures changed. Every line below is new or shorter than before.

**From the brief (already approved, listed for completeness)**
1. Tag pill: "Evan Yap · Open to internships".
2. Headline: "I build AI *systems,* / and *check* they work." (same words as before, new styling).
3. Hero lede: "Engineering Systems and Design student at SUTD and AI Business Consultant Intern at Univers. Looking for software engineering and AI internships." (replaces "I'm Evan Yap, an engineering student in Singapore. I build agents and tools with AI, measure whether they earn their place, and keep only what the numbers support. Looking for…").
4. Credentials line: "Top 5 Corporate Website Revamp · 2nd Vietnam Grand Challenge · 1 of 6 SUTD TEP scholars" (replaces the Now / Studying / Recognition rows).
5. Section titles: "About *me*", "My *experience*", "Selected *work*", "*Toolkit*", "Let's *talk*" (the last replaces "Good work starts with hello.").
6. Hero pills: "Download resume" and the email address.

**Selected work cards (please check)**

| Card | Mono label | Figure | Title | Short line |
| --- | --- | --- | --- | --- |
| Website revamp | Top 5 · Frontend · 2026 | 9 pages | Corporate Website Revamp Challenge | A nine-page interactive redesign, built with no framework. Pitched live to the CEO. |
| Assistant bot | Full-stack · 2026 | ~65% cheaper | Personal Assistant Bot | A Telegram assistant whose three-model chain tries the cheapest model first. |
| Trading agent | Developer · 2026 | 174 tests | Autonomous Trading Agent | I backtested the LLM layer against a plain rule, found no measurable edge, and removed it. |
| Research agent | Full-stack · 2026 | 0–100 rating | Decarbonisation Research Agent | Answers only from the sources it retrieved, as a cited brief or a rated verdict on an ESG claim. |
| V-Bẫy | 2nd place · Strategy · 2026 | $350M TAM | Project V-Bẫy | An AI-driven telecom honeypot against voice-phishing networks. I sized the market and built the financial model. |
| Others | Others · 2025–2026 | 2 more | Dragon Tiles · SleepWise | An interactive outdoor piano sculpture, and an app that nudges you to bed on time. |

- The labels shorten the old meta lines ("Frontend developer" → "Frontend", "Strategy and research lead" → "Strategy", the months dropped). The project pages keep the full lines.
- The mockup's Others label said "2025"; I used "2025–2026", because Dragon Tiles ran Sept 2025 – Mar 2026.
- The mockup's trading line said "found no edge"; I kept "no measurable edge", as the summary says. The mockup's research line said "a truth rating on every claim", but a research brief has no rating, so the line says "a cited brief or a rated verdict on an ESG claim".
- Each card ends "Read more →", and the trading agent's "Read the case study →".

**Other new or shorter lines**
7. Contact pills: "Resume", "GitHub", "LinkedIn" (were "Download (PDF)", "github.com/evanyap7", "in/evanyapzhikai").
8. Footer: "© 2026 Evan Yap" (dropped "· Built by hand with HTML, CSS and JavaScript").
9. Menu: "Selected work", "Toolkit" (was "Toolkit and credentials"), "Email".
10. About statement: unchanged words; "delete" is the serif accent.
11. Project pages: "← All work", "Overview", "Stack", "Links", "Next project". Project titles accent one word: Corporate Website *Revamp* Challenge, Personal Assistant *Bot*, Decarbonisation Research *Agent*, Project *V-Bẫy*, *Others*.
12. Others page label: "Dragon Tiles · SleepWise · 2025–2026". The Dragon Tiles and SleepWise text and meta lines are unchanged.
13. Diagram captions lost their "Fig. 4.x" numbers; the words are unchanged ("Model chain, cheapest first", "Idea to ledger", "Claim check", "Market sizing, to scale", "Homepage, branding redacted", "Piano keys, and a bedtime nudge").
14. Meta descriptions for the five new pages (each a trimmed version of its summary):
    - Website revamp: "A nine-page interactive redesign of a company's website, built with no framework and no build step. Top 5 against senior solution architects worldwide, pitched live to the CEO."
    - Assistant bot: "A serverless Telegram assistant for calendars, expenses, bill splitting and email, from text, voice notes or photos. A three-model chain tries the cheapest model first."
    - Research agent: "A research tool for energy engineers and decarbonisation consultants. It answers only from the reports and PDFs it retrieved, as a cited brief or a verdict on an ESG claim."
    - V-Bẫy: "An AI-driven telecom honeypot and DaaS platform to intercept and expose voice-phishing networks. 2nd place at the Entrepreneurial Solutions to Vietnam's Grand Challenge Hackathon."
    - Others: "Two smaller builds: Dragon Tiles, an interactive outdoor piano sculpture, and SleepWise, an app that nudges you to bed on time."
15. The main page's `og:image:alt`: "Evan Yap's portfolio: the headline "I build AI systems, and check they work" in white on black."
16. Case study: the title's serif accent is now the one word "deleted" (was the phrase "deleted the LLM." in blue); the top link reads "← All work" (was "← Back to work"); the old page footer (© 2026 Evan Yap, GitHub, LinkedIn) and the "Back to all work" and "Back to 04 Selected work" links gave way to the shared footer and the Next project card.
17. Dropped copy: the section notes ("Singapore", "2023 – now", "Seven projects · 2025 – 2026", "Updated Oct 2026") and the Intro spec rows.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#000` | Page |
| `--card` | `#0a0a0a` | Cards, nav, plates |
| `--line` | `rgba(255,255,255,.10)` | Hairlines, card borders |
| `--line-2` | `rgba(255,255,255,.18)` | Pill borders, hover borders |
| `--text` | `#fafafa` | Text, solid pills |
| `--muted` | `#a1a1a1` | Secondary text, diagram lines |
| `--dim` | `#7b7b7b` | Mono labels, dates. **4.96:1 on `#000`, 4.68:1 on `#0a0a0a`** (checked in JS on every load of the check page). The mockup's `#737373` fails at 4.43:1. |
| `--signal` | `#6d86ff` | Diagrams and the focus ring only. **6.50:1 on `#000`, 6.13:1 on `#0a0a0a`** |
| `--font-sans` / `--font-mono` / `--font-serif` | Geist / Geist Mono / Instrument Serif, with Helvetica Neue, SF Mono and Georgia fallbacks | |
| `--t-title` | `clamp(60px, 12vw, 176px)` | Section titles, Geist 600, −0.05em |
| `--t-body` / `--t-lede` / `--t-card` / `--t-mono` | 17 / 20 / 20 / 12.5px (16 / 18 / 20 / 12px on phones) | |
| `--radius` | 18px | Cards |
| `--space` | `clamp(88px, 11vw, 168px)` | Between sections |

## Decided differently, and why

- **`--dim` is `#7b7b7b`** and **`--signal` is `#6d86ff`**, the values the brief suggested, verified above.
- **Section titles start at 60px, not 64px**, so "experience" and "Selected" fit a 320px screen. On phones "Selected work" is set at 13vw on one line (it wrapped to two, and the cards then hid most of "work"), and the cards tuck over 0.22em of it instead of 0.32em so it stays legible.
- **Toolkit tabs on phones sit two by two** in the same rounded control. Four labels in one pill row do not fit below about 480px, and a scrolling row hides tabs.
- **Others has no figures row.** There are no honest big numbers for it beyond "2 more", which the card already shows.
- **The SUTD mark stays in Education**, turned white like the Univers logo (the brief did not mention it either way).
- **The blink stays**, and the cartoon's blue disc stays `#2541e6` as allowed. The cartoon needed no other colour change: its dark sleeve reads on the card.
- **The diagram pause button is 32px** with a 48px hit area from a pseudo-element; the target check measures the hit area. The clock beside it stays.
- **Work cards are named by their title and "Read more"** (`aria-labelledby`), so a screen reader hears "Personal Assistant Bot, Read more" rather than the whole card.
- **The open menu makes the footer inert too**, since the footer sits outside `main` now.
- **Section spacing is a top margin**, not padding, so a nav link lands with the title just under the floating nav.
- The section title on Toolkit is the single word "*Toolkit*" (the brief's first option); the tablist keeps the name "Toolkit and credentials".

## Known limitations

- Mobile performance was not measured. Nothing heavy was added (two small CSS files, five small HTML pages, a 7 KB avatar), and the old photo files are no longer requested, but check it on the preview deploy.
- `img/evan.jpg` and `img/evan-600.jpg` are no longer used anywhere. I left them in place; delete them if you do not want the About photo back.
- The share image shows the nav, tag, headline, lede and pills; the credentials line falls below 630px.
- With the floating nav, a 16px strip of page scrolls visibly above it. That is the Visuvate look, but it is visible on light content such as the Toolkit rows.
- The case study's title runs three lines at 1440px wide; it is the longest title on the site.
- `docs/superpowers/specs/2026-10-14-portfolio-revamp-design.md` and the round 2 notes describe the drawing set; I left them as history.
