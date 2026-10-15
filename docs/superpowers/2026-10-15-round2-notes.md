# Round 2: bigger type, 4.6 Others, Toolkit tabs, icons, fonts and motion

Date: 2026-10-15
Branch: `revamp/drawing-set` (not merged, pushed or deployed)

The check page reads **PASS 603**. It was PASS 492 at the start. The new checks cover the sixth project, the toolkit tabs, the tab deep links, the `#work-others` link, every toolkit tab in the fit runs, and the Instrument Serif load. The check page also passes in WebKit (Playwright 1.63). The console is clean on `index.html` and on the case study. Lighthouse (mobile) scores 100 for accessibility.

## 1. Bigger, more readable type

Every size now comes from a `--t-…` token at the top of `css/base.css`. Laptops at least 1024px wide and at most 760px tall (1280 × 650, 1024 × 700, 1366 × 720 and so on) keep the old, smaller set, because the larger one cannot fit Selected work at 1280 × 650. Every other screen gets the larger set: 1440 × 800, 1920 × 1080, tablets and phones.

| Token | What | Old | New (compact, ≤760px tall) |
| --- | --- | --- | --- |
| `--t-mono` | Mono labels, meta, captions, the stack, figure captions | 10.5px (11px from 1440 wide) | **12px** (10.5) |
| `--t-body` | Body text, About paragraphs | 15px (About 16px) | **16.5px** (15) |
| `--t-text` | Role points, rows, spec values | 14–14.5px | **15.5px** (14) |
| `--t-small` | Role titles | 13.5px | **14.5px** (13.5) |
| `--t-lede` | Intro lede, Contact invite | 18px | **19px** (18). Phones: 16 → 18px |
| `--t-nav` | Bar navigation | 13.5px | **14.5px** (13.5) |
| `--t-link` | Button, project links, tabs | 14.5px | **15.5px** (14.5) |
| `--t-title` | Sheet titles, now serif | 40px Switzer | **50px Instrument Serif** (36). Phones: 32 → 40px |
| `--t-org` | Employer names, Others titles | 17px | **18px** (17) |
| `--t-row` | Project row titles | 16.5px | **19.5px** (16.5) |
| `--t-key` | Row key figure | 15px | **16px** (15) |
| `--t-summary` | Project summary | 15px | **16.5px** (15) |
| `--t-figure` | The numbers in `.figures` | 24px | **26px** (24) |
| `--t-figure-label` | `.figures dt` | 12.5px | **13.5px** (12.5) |

The case study uses the same tokens, so its mono labels moved from 10.5 and 11px to 12px.

Layout changes that make the larger type fit:
- The side-by-side work panel (diagram on the left, summary and stack beside it) now runs up to 899px tall instead of 799px, so it covers 1440 × 800. Above 760px tall the plate is 416px wide instead of 372px, so the figure caption stays on one line.
- The stacked plate used at 900px tall and up is now `clamp(228px, 100svh − 640px, 360px)`. It was `− 570px`.
- On short laptops the tool marks sit at the start of the stack's first line, not on a row of their own.

### Fit slack (px left over on one screen; must be ≥ 0)

| Screen | Tightest | Others worth knowing |
| --- | --- | --- |
| 1280 × 650 | Work with 4.3 open: **2** (3 with fallback fonts) | Experience 5, Work 4.4 8, other projects 13, Contact with fallback fonts 15, Toolkit tab 53 |
| 1440 × 800 | Work with 4.6 open: **78** | Work 4.1 to 4.5: 101 (was 4 at 4.3), About and Experience 101, Toolkit tab 163 |
| 1920 × 1080 | Work with 4.3 open: **142** | Everything else 143 or more |

Every sheet is exact at all three sizes, with each of the six projects and each of the four tabs selected in turn, with web fonts and with the fallback fonts. The smallest diagram note renders at 10.0px at 1280 × 650, 11.2px at 1440 × 800 and 14.5px at 1920 × 1080.

## 2. 4.6 Others

- A new row: 4.6 · Others · `DRAGON TILES · SLEEPWISE` · "2 more". The ids are `work-others`, `row-others` and `panel-others`. `#work-others` opens it, and a deep-link check covers that.
- The panel restores the fuller wording from `9ee7848`, unchanged: titles, meta lines (the Dragon Tiles nomination is in the accent, like the other awards) and both paragraphs. Each item also shows marks for the tools named in its paragraph (Python and Blender; React, Google Calendar and Node.js).
- Fig. 4.6, "Piano keys, and a bedtime nudge": one plate with two drawings in ink and blue only.
  - Dragon Tiles: an octave of keys pressed left to right, then two sound arcs drawn in.
  - SleepWise: a blue crescent moon whose ring pulses three times, beside a calendar whose tick draws in.
  - Pure CSS keyframes, not reel.js. It plays once, for about 4.5 seconds, each time Others opens, so it needs no pause button under WCAG 2.2.2.
  - The plate has `role="img"` and an `aria-label`. The SVGs are `aria-hidden`.
  - With Reduce Motion it is a static drawing.
- The "Also built" paragraph and its CSS are gone. The grid is `repeat(6, auto) 1fr`. The checks now expect six projects and Fig. 4.1 to 4.6. The README's "add a project" note is updated.

## 3. Toolkit and credentials as tabs

- A WAI-ARIA tabs widget in the new `js/tabs.js` (2.4 KB), started from `main.js`.
  - Toolkit, Recognition, Education and Certifications, with Toolkit selected on load.
  - Roving `tabindex`; ← and → wrap; Home and End; selection follows focus.
  - `aria-selected`, `aria-controls` and `aria-labelledby`. The panels get `role="tabpanel"` and `tabindex="0"`.
- Without JavaScript the tab row stays `hidden` and all four panels show one under another, as `work.js` does for projects. The `data-tabs` attribute is banned by the `removed` check, so the widget uses `data-kit`.
- `#education` and `#certifications` still work: they open their tab and scroll to the sheet, on load and on `hashchange`. `#toolkit` is unchanged. Recognition's panel now has the id `recognition`.
- Each panel has more air: full-width rows with a 13rem label column, body text at 16.5px, the honours ("Top 5", "2nd place", "1 of 6", "Nominated") in the serif at 27px, and employer and school names at 18px.
- On phones the four labels share one row edge to edge, and every tab is 44px tall. That fits from 375px wide. At 320px the row scrolls sideways and fades at its right edge, and no label is ever cut off with an ellipsis.
- New checks:
  - `tabs`: the roles and wiring, one panel shown, the arrows, Home, End and wrapping, and clicking.
  - `tabLink`: `/#education` at 1440 × 800 and `/#certifications` at 393 × 852.
  - `fit` measures every tab at each fit size, and `fitFallback` repeats it with fallback fonts.
  - Tabs are included in the 44px target check.

## 4. Icons, fonts and motion

### Fonts
- Instrument Serif (Google Fonts, regular and italic, `display=swap`, in the same request as Fragment Mono) is the `--font-serif` token, with the fallback stack Georgia, "Times New Roman", serif. It sets:
  - the sheet titles
  - the About statement
  - the Contact title (now 44–106px)
  - the italic "check they work." in the hero, at 1.1em
  - the case study title, whose blue phrase is now in italic
  - the Recognition honours
- Switzer, Fragment Mono and Satoshi 900 (the wordmark) are unchanged.
- The hero underline was re-measured after the font change. Each line of the headline is now its own box, so the underline's offset went from −0.1em to −0.265em, which keeps it clear of the descender in "they". It was checked in screenshots at 1440 × 800 and 1280 × 650. On phones the drawn stroke is still replaced by a text underline.
- `fitFallback` now also overrides `--font-serif`. A new check confirms Instrument Serif loads.

### Icons and logos
- Every symbol in `img/icons.svg` is already `fill="currentColor"` (Simple Icons) or a `currentColor` stroke (Feather), so they render in ink with no filters. No brand colours appear.
- Toolkit tab: a mark and name per tool, in `--ink-2`. Tools without a mark are text only, in the same row style. Those are SQL, Vercel AI SDK, REST APIs, OAuth 2.0, LLM agents, Prompt engineering, Data analysis, Excel and Sheets, Grasshopper and CAD. Gmail, Calendar and Sheets APIs shows three marks.
- Project stacks: a row of marks above the mono stack, only for tools that have a mark.
  - 4.1: JavaScript, Three.js, CSS, Vercel.
  - 4.2: Next.js, TypeScript, Gemini, Perplexity, Google Cloud, Gmail, Sheets, Calendar, Zod.
  - 4.3: Python, SQLite, Telegram.
  - 4.4: Next.js, React, TypeScript, Tailwind, Gemini, Zod.
  - 4.5 has none, because its stack is methods, not tools.
  - Groq, Vercel AI SDK, Pydantic, pytest, Databento, Webull and the others have no mark, and none was invented.
- Intro spec: the Univers logo beside "Now" and the SUTD mark beside "Studying". Education has the SUTD mark above the school's name. All are decorative (`alt=""`), because the text names the organisation.
  - **The SUTD file includes the university's full name in tiny type under the mark, which is illegible at 14–22px, so it is cropped to the mark with `object-fit: cover`.** The file is unchanged.
- Contact: GitHub and LinkedIn (Feather) and two new line icons drawn for this site, `line-document` (resume) and `line-mail` (beside the email address), in the same 2-unit stroke on a 24 grid, about 1.5px at the rendered size. The address text moved into a `[data-contact-text]` span so the icon survives `applyContactEmail()`. The copy fallback now selects only that span.

### Motion
Everything is inside `prefers-reduced-motion: no-preference`. With Reduce Motion, Chromium and WebKit both report `document.getAnimations().length === 0`:
- after load
- after scrolling every sheet
- after opening 4.6 and 4.5
- after switching tabs

The counters show their final values and the frames are fully drawn. A new base rule also zeroes transition durations under reduce, so even colour fades land at once.

- (a) **Headline:** the two lines rise and fade in, 100ms and 280ms after load, in CSS only. Then the underline draws at 950ms. On phones the headline wraps freely, so it rises as one block.
- (b) **Frames:** each `.sheet::before` frame is now four 1px gradients whose lengths are registered `@property` percentages. They draw clockwise in about 1.6s the first time the sheet scrolls into view; `reveal.js` adds `.is-drawn`. The sheet label types in with a `clip-path` stepped over 600ms. A browser without `@property` shows the whole frame at once.
- (c) **Count-up** (`js/count.js`, 2.3 KB): a panel's `.figures dd` and its row's key figure count from zero over 800ms the first time the panel opens on screen. Only the digit runs change, so "~65%", "$350M", "31/31", "24–36", "$7.5M" and "0–100" keep their form, and the final text is the HTML's own. The key figure's width is pinned before counting, so the row never shifts; this was measured, and the title width is constant throughout.
- (d) **Panel switch:** the newly opened panel fades and rises 6px over 240ms. It is CSS only, with opacity and transform and never height. `hidden` semantics, the fit measurements and reel.js's `project-toggle` are untouched.
- (e) **Toolkit:** tools rise in row by row, 70ms per row and 30ms per item, each time a tab is shown, once the sheet has been drawn.
- (f) **Scroll line:** a 2px accent hairline along the bar's bottom edge, `scaleX` set from the existing passive scroll listener in `index.js`. It is `aria-hidden`.
- (g) **Intro ambient:** a faint 24px dot grid (ink at 7%) behind the Intro, with a 520px lens that brightens the dots it passes to accent at 40%.
  - The lens and the dots inside it move in opposite directions by transform, so the dots stay put while the lens drifts.
  - It is `aria-hidden` and `pointer-events: none`, sits behind the content (`isolation: isolate` on `#top`, `z-index: −1`) and affects no layout.
  - Wide screens only.
  - **It drifts for 36 seconds (three 12-second passes) and then rests**, rather than looping forever: an endless decorative motion would need a pause control under WCAG 2.2.2.
- **Lean** (`js/lean.js`, 1.2 KB): with `(hover: hover) and (pointer: fine)` and motion allowed, the cartoon's head turns up to 5px toward the pointer, rAF-throttled, and resets when the pointer leaves.
  - **I tried moving the blue disc too and dropped it.** The suit is clipped to the disc's circle, so moving the disc showed a sliver of blue under the shoulders.
- The wave (`wave.js`) is unchanged.

None of the following came back: the keyboard, the marquee, WebGL, letter-by-letter titles, cursor glow, sounds or `backdrop-filter`. Hover styles stay inside `(hover: hover)`.

New JavaScript totals about 6 KB unminified across `tabs.js`, `count.js` and `lean.js`. No image files were added. Two symbols were added to `icons.svg`, and the one Google Fonts request now also carries Instrument Serif. Lighthouse here measured accessibility, best practices and SEO, each 100 on mobile. The MCP Lighthouse tool does not run the performance category, so **mobile performance was not measured this round**. Nothing heavy was added, but check it on the preview deploy.

## Copy and design decisions to confirm

1. **Selected work's note** changed from "Five projects · 2026" to "Seven projects · 2025 – 2026". It now covers Dragon Tiles (Sept 2025 – Mar 2026) and SleepWise (2025). Change it back or reword it if you prefer.
2. **4.6 key figure** is "2 more". **Fig. 4.6's caption** is "Piano keys, and a bedtime nudge".
3. **Recognition's panel id** is `recognition`. It is new, so `#recognition` deep-links too.
4. The **Toolkit list** is now real list items (icon and name) instead of a middot-separated line. The items and their order are unchanged.
5. The **SUTD logo** is cropped to its mark, as described above.
6. **The italic serif in "check they work."** is 10% larger than the sans around it, so it reads at the same optical size.
7. The case study title's blue phrase "deleted the LLM." is now italic serif, to match the hero.

## Known limitations

- 1280 × 650 still has only 2px of slack with 4.3 open, and 5px on Experience. Any copy added there will need the compact sizes trimmed or the layout changed.
- The compact type set applies to every laptop at most 760px tall, so on those screens the text is the same size as before this round. That is what the brief allowed. A 1366 × 768 screen gets the larger set; it is not a checked size.
- At 1440 × 800, Toolkit, Recognition, Education and Certifications leave a lot of empty sheet below them (163–330px), because the sheet keeps one screen's height. More air was the brief, but the bottom may feel empty.
- A deep link such as `#education` gives the panel focus, so Chrome draws its accent focus ring around the panel until the next click. That is standard fragment behaviour and is good for keyboard users, but it is visible.
- The original spec (`docs/superpowers/specs/2026-10-14-portfolio-revamp-design.md`) dropped Instrument Serif and banned logos, count-up numbers, chip-style staggers and blueprint grids. This round reverses those at your request. I left the spec as a historical record, and this file and the README describe the current state.
