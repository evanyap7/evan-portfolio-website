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

## Round 2: plain tag pill, the photo in About, a readable work title and more shades

### Result

- Check page: **PASS 4714** in Chromium and in WebKit. It was 4129. The new checks are the About photo, the work title's baseline at all 13 sizes, the longer contrast list and the cartoon's removal.
- Console: clean on all seven pages. Reduce Motion: no running animations after load, scrolling or switching tabs on any page, and counters show their final values.
- Lighthouse (mobile) on `index.html`: 100 for accessibility, best practices and SEO. The first run scored 97: axe cannot see a border-image, so it read Contact's text against the black body. Each band now also has a real `background-color` in its own grey.
- Screenshots checked at 1440 × 900 (hero, About, the work title with the first card row, Contact) and at 393 × 852 (the same four). Fixed along the way:
  - A sub-pixel seam showed the black page as a dark line between the light Contact band and the footer. Bands now reach 1px up over the band above.
  - The About photo filled the phone's width. It is now at most 280px wide on phones, 360px on tablets and 400px on desktops.
  - After a reload at the bottom of the page, the nav marked Toolkit instead of Contact. `index.js` now also updates on `load`.

### Changes

1. **Tag pill**: only "Open to internships", after a 6px static dot. The photo and name are gone, and so is `img/evan-120.jpg`.
2. **About**:
   - Evan's photo in a card, using `img/evan-600.jpg` with `img/evan.jpg 1000w` in the `srcset`, lazy-loaded.
   - The card has 8px of padding. The photo is cropped to 4:5 with rounded corners and `object-position: 50% 30%`, which frames the face.
   - Alt text: "Evan Yap smiling, in a navy suit and burgundy tie, standing in an office." This is the alt the About photo had before round 1.
   - The photo stays in colour. It is a photograph, not part of the palette, and a grey face read cold.
3. **The cartoon is gone**: its SVG, `js/wave.js`, its CSS and its keyframes. The `cartoon` check is replaced by `aboutPhoto`, and the `removed` check now also bans `[data-wave]`, `.wave`, `.tag img` and `wave.js`. I found no reason to keep it once About had the photo.
4. **Selected work title**:
   - The title's line box ends 0.146em below its baseline (measured with Geist), so the cards now rise 0.12em instead of 0.32em (`13vw × 0.12` on phones). Their top edge sits 1 to 5px below the baseline.
   - Measured by the new `workTitle` check: 1280 +4.2px, 1440 +4.6, 1920 +5.4, 1024 +3.3, 768 +2.5, 393 +1.3, 320 +1.7. It is positive at all 13 sizes.
   - The check places a zero-size inline-block at the end of the title, which sits on the baseline.
   - "Selected work" has no descenders, so the cards meet the bottom of the letters and cover none of them.
5. **Shades**:
   - **Ramp** (`css/base.css`):

     | Token | Value |
     | --- | --- |
     | `--grey-950` | `#000` |
     | `--grey-900` | `#0b0b0b` |
     | `--grey-850` | `#111` |
     | `--grey-800` | `#141414` |
     | `--grey-700` | `#3d3d3d` |
     | `--grey-650` | `#595959` |
     | `--grey-600` | `#666` |
     | `--grey-500` | `#808080` |
     | `--grey-400` | `#a1a1a1` |
     | `--grey-200` | `#d4d4d4` |
     | `--grey-100` | `#f4f4f2` |
     | `--grey-50` | `#fafafa` |

     Every surface and text token is named from it.
   - **Text, four greys on dark**: `--text #fafafa` for headings and figures, `--text-2 #d4d4d4` for reading text (About, the experience points, the Toolkit rows), `--muted #a1a1a1` for secondary text and `--dim #808080` for labels.
   - **`--dim` changed from `#7b7b7b` to `#808080`**, so it passes 4.5:1 on the new card head (4.66:1 on `#141414`).
   - **Bands**, edge to edge, each with a faint hairline where it meets the one above:

     | Section | Band |
     | --- | --- |
     | Hero | `#000`, with a very soft radial grey glow behind the headline |
     | About | `#0b0b0b` |
     | Experience | `#000` |
     | Selected work | `#0b0b0b` |
     | Toolkit | `#111` |
     | Contact and the footer | `#f4f4f2` |

     Each band is a filled border-image reaching 100vw either side. It draws outside the box without widening the page, and the overflow check stays green at every size. Space now sits inside each band, and a negative `scroll-margin-top` still lands nav links with the title just under the nav.
   - **Cards**: a vertical gradient from `#141414` to `#0b0b0b`, a hairline border and a lighter top edge (white at 16%). The old radial top glow is gone, because it pushed the label's background past what `--dim` can pass on.
   - **Inverted finale**: Contact and the footer are the light band. Inside it every token is redefined:

     | Token | Light value |
     | --- | --- |
     | `--text` | `#0b0b0b` |
     | `--text-2` | `#3d3d3d` |
     | `--muted` | `#595959` |
     | `--dim` | `#666` |
     | Hairlines | black at 10% and 20% |
     | `--focus` | `#0b0b0b` |

     The Resume, GitHub and LinkedIn pills are solid near-black; the Copy pill is outlined.
   - **Why Contact, not Experience**: Contact is short and centred, and it ends the page with the footer, so the light band reads as a deliberate finale. Experience is long reading text, and a light band mid-page broke the black rhythm.
   - **The floating nav** stays a solid dark pill and gains a soft shadow, so it reads over the light band. The progress line uses `mix-blend-mode: difference`, so it stays visible over light.
   - **Contrast**, all computed by the `contrast` check:

     | Pair | Ratio |
     | --- | --- |
     | Four dark greys on `#000`, `#0b0b0b`, `#111` and `#141414` | 4.66:1 lowest (`--dim` on `#141414`) to 20.12:1 |
     | Light band greys on `#f4f4f2` | 5.21:1 to 17.87:1 |
     | Solid pill text, dark | 20.12:1 |
     | Solid pill text, light | 17.87:1 |
     | Focus ring on `#000` | 6.50:1 |
     | Focus ring on `#141414` | 5.71:1 |
     | Focus ring on `#f4f4f2` | 17.87:1 |

   - The only colour left is `--signal`, in the diagrams and as the focus ring on dark.
6. **Meta description** (main page): "Evan Yap is an Engineering Systems and Design student at SUTD and an AI Business Consultant Intern at Univers. He builds AI systems and proves they work. Looking for software engineering, AI engineering and quant roles."
7. **Share image** recaptured, with the plain pill and the glow.

### New copy (as supplied, for the record)

- Tag pill: "Open to internships".
- About statement: "I’m a builder. I ship systems, then *prove* they work."
- About paragraph 1: "I’m Evan, an Engineering Systems and Design student at SUTD on a dual degree with a Master’s in Technology Entrepreneurship, and one of six Technology Entrepreneurship Programme scholars. My coursework covers algorithms, object-oriented programming, machine learning and data modelling. I’m aiming for software engineering, AI engineering and quant roles."
  - The coursework list is not on the site. It comes from `docs/superpowers/2026-10-14-content-signoff.md`, which reads "algorithms and object-oriented programming, machine learning, and data modelling and visualisation". Please confirm it.
- About paragraph 2: "I build end to end. An autonomous trading agent in Python with 174 tests in CI, where deterministic code verifies, sizes and risk-checks every trade. A Telegram assistant whose three-model chain cut cost per call by about 65%. An internal AI research agent, built and deployed at Univers. A nine-page website, built with no framework, that reached the Top 5 against senior solution architects."
- About paragraph 3: "I backtest before I believe. I tested an LLM trading layer against a plain momentum rule on 112 symbols, found no measurable edge, and deleted it. At Univers I calibrated an HVAC energy model to within 2–3 percentage points of observed use. Away from the desk I captain SUTD’s men’s floorball team and train for HYROX."
- The meta description above.

### Removed copy

- Tag pill: "Evan Yap ·" and the photo.
- About statement: "I keep what the numbers support and delete what they don’t."
- About paragraphs:
  - The scholarship sentence: "I’m studying Engineering Systems and Design at the Singapore University of Technology and Design, on a dual degree with a Master’s in Technology Entrepreneurship, as one of six recipients of its Technology Entrepreneurship Programme Scholarship."
  - "I work where data, automation and AI meet: agents that do the research, models that test the assumptions, and interfaces that make the answer easy to act on. Then I measure whether each one earned its place."
  - From the third paragraph:
    - guitar in the church’s worship ministry since 2019
    - SUTD’s Google Developers Club
    - helping attendees debug at DevFest Singapore 2025
    - "I also run on a lot of coffee."
  - The floorball captaincy and HYROX stay.
- The cartoon's alt text: "A cartoon of Evan in a charcoal suit and burgundy tie, smiling and waving hello."
- Old meta description ending: "He builds AI systems and measures whether they work. Looking for software engineering and AI internships."

### Known limitations

- The hero lede still says "Looking for software engineering and AI internships", while About now says "software engineering, AI engineering and quant roles". The lede was approved in round 1, so I left it. Change it if quant should lead there too.
- The project pages keep plain black backgrounds. The bands are only on the main page, but the project pages' cards use the new gradient.
- The band hairlines (white at 7%) are deliberately faint and may not show on dim screens. The band greys carry the rhythm.
- `img/evan-120.jpg` is deleted. `img/evan.jpg` and `img/evan-600.jpg` are in use again.

## Round 3: About for recruiters, a proof strip, and precise motion

Built on the controller's e1ef359 (a 40–72px gap above the work cards, 32px on phones) and bfdc3ab (the hero pill removed; About says powerlifting).

An editor had reformatted `index.html` on disk, uncommitted: Prettier-style line wrapping, plus "and enjoy powerlifting". I committed that alone as adcbfe7, so later diffs stay readable. The About rewrite below then replaced the sentence with the supplied "train for powerlifting".

### Result

- **Check page**: **PASS 5039** in Chromium and WebKit; it was 4714. WebKit was run twice after the timing fix below.
- **Consoles**: clean on all seven pages.
- **Reduce Motion** (all seven pages):
  - no running animations after load, scrolling, tab changes or hovering
  - no titles split, and every title shown in full
  - no spotlight or magnet set up
  - the timeline drawn whole
  - every counter at its final value
- **Lighthouse (mobile) on `index.html`**: 100 for accessibility, best practices and SEO, with no failed audits. The first run flagged CLS 0.05 in the performance-only audit. See "Layout shift" below.
- **Cross-document view transition** (Chromium 153): clicking the Personal Assistant Bot card sets `.vt` on arrival, the page morphs, and the title's words are in place at once. There were no errors.
- **Screenshots checked**:
  - 1440 × 900: About with the sticky photo and the proof strip; Experience mid-scroll, with the timeline 38% drawn and both nodes lit; the work cards with the pointer over Personal Assistant Bot (soft light, brighter border near the pointer, 3px lift, arrow nudged); Contact with the GitHub pill pulled about 5px toward the pointer.
  - 393 × 852: About (text column, 2×2 proof strip) and Experience (timeline at the left edge, nodes beside each role).
  - Nothing read as busy. I kept the spotlight faint: white at 5.5% inside and 45% on the border.

### 1. About copy

The statement is unchanged. The four paragraphs are the supplied text, word for word.

The proof strip sits under them:

| Figure | Label |
| --- | --- |
| 174 | tests in CI, trading agent |
| ~65% | lower cost per call, LLM chain |
| 2–3 pp | from observed use, HVAC model |
| 12 | soldiers led, Detachment Commander |

- It uses Geist numerals with mono labels and a hairline top, 4-up on wide screens and 2×2 on phones. The figures count up through the existing `count.js`.
- The text column is capped at 38em (about 68 characters a line).
- From 1024px the photo card is `position: sticky` beside the longer text.

**Removed copy**:
- The coursework sentence: "My coursework covers algorithms, object-oriented programming, machine learning and data modelling."
- The project run-down: "I build end to end. An autonomous trading agent…", ending "…against senior solution architects."
- "I backtest before I believe…", including "Away from the desk…".
- The new paragraphs carry the same facts, except two: the website revamp's Top 5 (still on its card and in Recognition) and the coursework list.

**New wording to confirm**:
- "observed consumption" where Experience says "observed use".
- "a unit named Best Combat Unit" where Experience says "awarded".
- "soldiers led" in the proof label, where Experience says "a detachment of 12".

### 2. Motion

All of it lives in one new module, `js/motion.js` (about 6 KB unminified), plus CSS in `css/figures.css` and `css/home.css`.

- **Every effect, under Reduce Motion**: `motion.js` returns before doing anything, and all its CSS sits inside `prefers-reduced-motion: no-preference`.
- **Every effect, its properties**: only `transform`, `opacity` and `clip-path` animate.
- **Every effect, scroll**: no scroll hijacking.
- **Every effect, layout**: the title split measured identical heights before and after at 393px.

Each effect:

- **a. Titles**: each word is wrapped in a `clip-path` mask and an inner span. Words rise 140% from below the mask over 1s, `cubic-bezier(.16,1,.3,1)`, 60ms apart. The serif word gets the last slot and settles from `skewX(-10deg)`.
  - Section titles reveal when they enter view (IntersectionObserver, then unobserved).
  - The hero and project titles reveal on load.
  - The text nodes and the spaces between words stay in place, so the heading reads the same and nothing is `aria-hidden`. The new `titles` check verifies the exact text of the six main-page titles.
- **b. Hero**: the headline uses the same reveal. The lede, pills and credentials follow at 520, 600 and 680ms.
  - The glow moved to `.hero::before` and breathes on a 16s alternate loop: ±2% drift, scale 1 to 1.08, opacity 0.8 to 1.
  - It pauses (`.is-off`) while the hero is off screen.
  - The hero is `overflow: hidden`, so the scaled glow cannot widen the page.
- **c. Cards**: the work cards and the project pages' Next card get the spotlight, but only with `(hover: hover) and (pointer: fine)`.
  - The spotlight is a radial light and a masked border ring at the pointer, set rAF-throttled through `--mx` and `--my`.
  - The card lifts 3px and "Read more →"'s arrow slides 4px.
  - On touch screens no listener is attached, which the `pointerOnly` check verifies.
  - Toolkit rows were left alone. They are not cards, and a moving light on plain rows looked fussy.
- **d. Experience timeline**: a hairline track and a brighter fill (`scaleY(--p)`) run down the left of both role lists, 40px in (28px on phones).
  - `--p` is how far a reading line 60% down the screen has travelled through the section. A passive, rAF-throttled scroll listener sets it, attached only while the timeline is within 25% of the viewport.
  - Each role's 9px node fills white when `reveal.js` marks the role visible.
  - With Reduce Motion the line is whole.
- **e. About**: the photo wipes in from the top (`clip-path`, 1.1s) instead of fading. The proof strip counts up.
- **f. Contact**: "Let's talk" uses the title reveal. Its four pills (Resume, GitHub, LinkedIn, Copy) lean up to 6px toward a fine pointer, rAF-throttled, and settle on leave.
- **g. Page transitions**: `@view-transition { navigation: auto; }` inside `no-preference`.
  - The old page fades and lifts 8px out over 220ms; the new one rises 12px in over 380ms.
  - Each work card title and its project page `h1` share a `view-transition-name` (`.vt-<slug>`), so the title morphs.
  - A tiny inline head script listens for `pagereveal` and adds `.vt` when a view transition is running, which shows the arriving title's words at once.
  - No router: browsers without support simply navigate.
- **h. Unchanged**: the progress line, the diagrams, the tabs, the menu and focus. Everything new waits for IntersectionObserver or runs on the first screen only.

### Layout shift

Lighthouse's cold load showed CLS 0.05. A slow-network trace found the cause: Geist swapping in for Arial reflowed the hero headline from 3 lines to 2 on a 412px phone (0.14 on that trace). This predates round 3 and is not the motion.

A metric-matched fallback (`"Geist Fallback"`: local Arial, `size-adjust: 104.76%`, ascent 95.94%, descent 28.16%) brings the phone trace to 0.04 and desktop to 0.03. Lighthouse now reports no failed audits.

### Checks added

| Check | What it verifies |
| --- | --- |
| `titles` | Exact text; no `aria-hidden` inside headings; every word in place once seen. On the main page and every project page. |
| `pointerOnly` | The spotlight and magnets are set up only for a fine pointer that can hover. |
| `timeline` | The line is whole after scrolling through, and every node is lit. |
| `proof` | Four counted figures with labels. |

The check page's iframes now sit on screen at `opacity: 0` behind the results instead of 99999px to the left. Off screen, IntersectionObserver never fired inside them, which hid the reveals from the checks.

### Known limitations

- The trading agent card's title, "Autonomous Trading Agent", morphs into a different and much longer case-study title, so that transition reads as a scale and crossfade rather than a clean morph. The other five titles match their cards.
- A title scrolled past very fast (a flick, or a jump link) reveals when it next enters view, not before. Its text is in the DOM throughout.
- The hero glow loops for as long as the hero is on screen. It is decorative, its movement is under 3%, and it stops under Reduce Motion.
