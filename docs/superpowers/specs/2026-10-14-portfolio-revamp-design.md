# Portfolio revamp: the drawing set

Date: 2026-10-14
Status: draft, for Evan's review

## Why

Feedback on the current site:

1. There is no clear story guiding a reader through it.
2. Sections run past one screen and blur into each other.
3. Too many interactions compete for attention.
4. The bright, multi-colour look reads as playful rather than serious.

The site is for recruiters and engineers hiring software engineering and AI interns. They should finish it knowing who Evan is, what he has built, and how to reach him, in that order, without having to work out the interface first.

## Decisions already made

| Decision | Outcome |
| --- | --- |
| Story | Six screens: Intro → About → Experience → Selected work → Toolkit and credentials → Contact |
| Direction | The drawing set: a light, editorial layout based on engineering drawing sheets (mockup v2) |
| Interactions | Keep the waving cartoon, the project diagrams and the section indicator. Remove the rest (see Motion). |
| Cartoon | Stays in the hero, redrawn in the new palette. Evan's real photo moves to About. |
| Scrolling strip | Removed already, in `9ee7848` |
| Phones | Must work fully in mobile browsers, including iOS Safari and Android Chrome |

## The concept

Each section is a numbered sheet, like a page in a set of engineering drawings: a paper sheet on a grey desk, a thin frame inset from its edge, and a small title block in the corner (sheet number, "Drawn E. Yap", revision). Diagrams are captioned as figures (`Fig. 4.2`).

The concept comes from Evan's degree (Engineering Systems and Design) and his line "I build AI systems, and check they work". Drawings are how engineers show a design can be checked.

Rules that stop it becoming a costume:

- Drafting details are limited to the frame, the title block, the sheet index and figure captions. No crosshairs, dimension lines, blueprint grids or fake stamps.
- The paper colour, one ink and one accent carry the whole page. No gradients, glass, glows or shadows.
- Every label says something true. The cartoon caption reads "Drawn from a photo · see sheet 02", not "Drawn from life".

References and what each contributes:

- Rauno Freiberg (rauno.me): sections as sheets on a grey desk; tick-mark index of where you are.
- Huy Phan (huyml.co, Awwwards Site of the Day 14 Oct 2026): strict 12-column grid, plain label and value pairs instead of cards, local time in the header.
- Linear (linear.app): thin-line diagrams captioned as figures.
- Maria Vasilyeva (mariavasilyeva.com, Site of the Day 9 Oct 2026): personality added on top of a strict grid rather than through colour.
- Emil Kowalski (emilkowal.ski) and Dennis Snellenberg (dennissnellenberg.com): one typeface, two greys, one accent.

## Visual system

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--desk` | `#e6e5e0` | Page background around the sheets |
| `--sheet` | `#fafaf7` | Sheet background |
| `--ink` | `#111214` | Headings, primary text, the solid button |
| `--ink-2` | `#4f5156` | Body text |
| `--ink-3` | `#6c6e72` | Labels, captions, metadata. Darker than the mockup's `#8a8c90`, which failed contrast at 4.5:1 for small text. |
| `--rule` | `rgba(17,18,20,.10)` | Hairlines inside a sheet |
| `--rule-2` | `rgba(17,18,20,.22)` | Stronger hairlines: table tops, figure frames |
| `--accent` | `#2541e6` | The single accent: the underline, the selected project marker, the moving part of each figure, link hover, the cartoon's backdrop |

The diagrams use only these plus white. The old pastel set (mint, pink, lilac and so on) is gone everywhere, including the favicon and the case study page.

### Type

- Switzer (Fontshare, weights 400, 500 and 600) for everything readable.
- Fragment Mono (Google Fonts, 400) for labels, captions, the title block and the clock, set uppercase at 10.5 to 11px with 0.06em tracking.
- Satoshi, Inter and Instrument Serif are dropped.
- Headline: Switzer 600, `clamp(44px, 6.4vw, 104px)`, line height 0.95, tracking -0.045em.
- Sheet titles: Switzer 600, 40px on desktop and 32px on phones.
- Body: 15 to 18px, line height 1.5 to 1.55.
- Figures and numbers use `font-variant-numeric: tabular-nums`.
- Both fonts load with `font-display: swap`. Fallbacks are Helvetica Neue, Arial and `ui-monospace`.

### Layout

- On desktop, a sheet has a 12-column grid with 24px gutters and 40px side padding inside the frame.
- Corners are square (2px radius at most on the button). No pills.
- Components:
  - Desk bar
  - Sheet, with its label and title block
  - Solid button: ink background; turns accent on hover
  - Underlined text link
  - Spec list: label and value pairs over a hairline
  - Figure frame: white, hairline border, faint 16px dot grid, caption above
  - Project row

## The journey, sheet by sheet

Each sheet ends with a quiet "Next: 0X Name →" link at its bottom left, so a reader is always told where the story goes. Contact, the last sheet, links back to the top instead.

The desk bar carries the sheet index: six tick marks, with the current one drawn as an outlined box. Beside it sits `0X / 06 Name`, which updates as sheets scroll past. Each tick is a link to its sheet.

### 01 Intro: who is this, and why care?

- Headline: "I build AI systems, and check they work.", with the accent underline drawing under "check they work."
- Lede (draft, needs Evan's sign-off): "I'm Evan Yap, an engineering student in Singapore. I build agents and tools with AI, measure whether they earn their place, and keep only what the numbers support. Looking for software engineering and AI internships."
- Actions: "Download resume (PDF) ↓" (solid) and the email address (link).
- Spec list:
  - Now: AI Business Consultant Intern, Univers
  - Studying: Engineering Systems and Design, SUTD, 1 of 6 TEP scholars
  - Recognition: Top 5, Corporate Website Revamp · 2nd, Vietnam Grand Challenge
- Right side: the cartoon, captioned "Fig. 1.1 — The author, waving", with "Drawn from a photo · see sheet 02" on the right of the caption.

### 02 About: what kind of engineer?

- Left (columns 1 to 5): Evan's photo, captioned "Fig. 2.1 — The author, in person". `img/evan.jpg` with the existing `srcset`, cropped 4:5.
- Right (columns 6 to 12): the statement "I keep what the numbers support and delete what they don't." at about 32px, then three short paragraphs of about 50 words each, cut from the current three:
  - The degree, the dual-degree track and the scholarship.
  - How he works: data, automation and AI, agents that research, models that test assumptions.
  - Outside work: floorball captain, HYROX, guitar in his church's worship ministry, the Google Developers Club and DevFest volunteering.
- The Univers detail moves to Experience, where it belongs. Recognition, education and certifications move to sheet 05.

### 03 Experience: has anyone trusted him with real work?

- A table of roles. Each row has dates in mono, the organisation (with logo for Univers) and title, and two or three points.
- Univers (Aug 2026 to now) and EvanYapFitness (Sept 2024 to Jan 2026) get full rows with their points shortened to about 25 words each.
- "Earlier" lists The Social Nugget and the Singapore Army as one line each: role, dates and the single strongest point. The Army line keeps Detachment Commander, the detachment of 12 and the Best Combat Unit Award.
- Full detail stays in the resume. Every shortened point is shown to Evan before release, and no figures change.

### 04 Selected work: can he actually build?

- Left (columns 1 to 5): five project rows. Each row has its number (`4.1` to `4.5`), title, a mono meta line (award in accent, role, date) and one key figure on the right. Under the rows, an "Also built" line covers Dragon Tiles and SleepWise.
- Right (columns 6 to 12): the selected project's figure, then its summary, figures in a spec row, the stack in mono, and links. The summary and figures are the current text.
- Figures:
  - 4.1 Corporate Website Revamp: the existing screenshot in the figure frame.
  - 4.2 Personal Assistant Bot: the model chain diagram, animated.
  - 4.3 Autonomous Trading Agent: the idea-to-ledger diagram, animated.
  - 4.4 Decarbonisation Research Agent: the claim check diagram, animated.
  - 4.5 Project V-Bẫy: the market sizing diagram, animated.
- 4.1 is selected on load. On phones it is also the one open row.
- Behaviour is set out under "Projects on each screen size" below.

### 05 Toolkit and credentials: does he have the skills on paper?

- Left half: Toolkit as a spec table. One row per group (Languages, Frameworks, AI and data, Cloud and tools, Design and modelling), with the tools as a plain list separated by middots. No chips and no logos.
- Right half, three short tables:
  - Recognition: the four current rows.
  - Education: SUTD, VinUniversity and Victoria Junior College, one or two lines each.
  - Certifications: the two current rows, with the credential link.

### 06 Contact: what do I do next?

- Title: "Good work starts with hello." in the headline style. This is the current line.
- The email address large, as a link, with a "Copy" text button beside it. The button uses the Clipboard API, and shows "Copied" for two seconds.
- A spec list linking the resume (PDF), GitHub and LinkedIn.
- A footer line inside the sheet: "© 2026 Evan Yap · Built by hand with HTML, CSS and JavaScript."
- The WebGL backdrop is removed.

## Projects on each screen size

The same markup serves every size.

**Markup:**
- An ARIA tablist of project buttons, plus a panel for each project.
- Without JavaScript, every panel is shown in order under its button, so nothing is ever hidden behind a script.

**At 1024px wide and up** it behaves as tabs:
- The buttons sit in the left column. Only the selected panel shows, in the right column.
- Arrow keys move between projects, and Home and End jump to the first and last.

**Below 1024px** it behaves as an accordion:
- Each panel sits directly under its button, using CSS grid `order`, so no markup is duplicated.
- Tapping a row opens it and closes the one that was open. The opened row scrolls into view if its top went off screen.
- The tab roles switch to buttons with `aria-expanded`.

Deep links such as `#work-trading-agent` select that project on both layouts.

## Motion

Kept:

| Motion | When | Notes |
| --- | --- | --- |
| Cartoon wave | Once on load; again on hover or tap | Existing `wave.js` and keyframes, recoloured. It blinks every 5 seconds at rest. |
| Headline underline | Draws once, 0.7s after load | Drawn without `vector-effect: non-scaling-stroke`. With it, Chrome cuts the dash short, which is why the live underline stops before "work." |
| Project figures | Loop while their project is selected (or open on phones) and on screen | Existing `reel.js` timeline engine. Each figure has a visible pause button: an animation that runs longer than 5 seconds must be pausable (WCAG 2.2.2). |
| Sheet index | The box slides to the current tick | 300ms |
| Sheet entrance | Contents fade up 8px the first time a sheet enters | 500ms, once per sheet |

Removed:

- The PORTFOLIO keyboard: auto-play, typing, sounds and the phone readout.
- Kinetic letter and word animation on titles.
- Count-up numbers.
- Cursor glow on project cards.
- The Toolkit chip stagger.
- The About tabs.
- The WebGL contact backdrop.

With `prefers-reduced-motion: reduce`:
- Nothing moves. The cartoon rests mid-greeting, the underline is drawn, and each figure shows its finished state.
- A short note on sheet 01 is visible to screen readers only, so the absence of motion is not mistaken for a fault. The old iPhone report of "no motion" is the likely cause: Reduce Motion was switched on in iOS Settings.

The figures recolour by changing the constants at the top of `scenes.js`, and the SVG classes they animate, to the new palette. The timelines themselves stay.

## Screen sizes and mobile browsers

### One sheet, one screen

| Viewport | Behaviour |
| --- | --- |
| At least 1024 × 650 | Each sheet is exactly one screen: `min-height: calc(100svh - 60px)`, with a `100vh` fallback first. Content is sized with `clamp()` and `svh` so it fits from 1280 × 650 up to 2560 × 1440. |
| Up to 1023 wide, or under 650 tall | Sheets keep the frame and grow to fit their content. Nothing is clipped and nothing scrolls inside a sheet. |
| Phones (below 720 wide) | One column. Sheets have 8px desk margins and 20px inner padding. The title block sits at the end of the sheet rather than overlapping its corner. |

### The desk bar on phones

- The bar shows "Evan Yap" on the left and a "Menu" button on the right. It is 52px tall and has `env(safe-area-inset-top)` padding.
- The menu is a full-width panel under the bar:
  - The six sheets as numbered links, with the current one marked.
  - Resume and Email links.
  - The SGT clock.
- The menu is a button toggling the `hidden` attribute with `aria-expanded`, which works on every browser in the support list without the Popover API. Escape and choosing a link close it, and focus returns to the button.
- The tick index moves into the menu.

### Phone layout of each sheet

| Sheet | Phone layout |
| --- | --- |
| 01 Intro | Cartoon at 60% width above the headline. Headline at 44px. Actions stacked full width. Spec list as stacked rows. |
| 02 About | Photo first, then the statement and paragraphs |
| 03 Experience | Dates move above each role |
| 04 Work | Accordion, as described above |
| 05 Toolkit | Toolkit table first, then the three credential tables |
| 06 Contact | The email wraps safely (`overflow-wrap: anywhere`). The copy button sits on its own line. |

### Browser support

Supported, and tested before release:

| Browser | Versions |
| --- | --- |
| iOS Safari | 16, 17 and 18 (iPhone SE 375 × 667, iPhone 15 393 × 852, iPhone 15 Pro Max 430 × 932, plus landscape) |
| iPadOS Safari | 768 × 1024 and 1024 × 1366 |
| Android Chrome | Pixel 7, 412 × 915 |
| Desktop | Chrome, Edge and Firefox latest; Safari 17 and 18 on macOS |

### Rules that keep it working on phones

- No horizontal scrolling at 320px wide. Long words wrap: `hyphens: auto` on body text, and `overflow-wrap: anywhere` on figure labels and the email.
- Tap targets are at least 44 × 44px: nav and menu links, project rows, the copy button, the pause buttons.
- Hover styles sit inside `@media (hover: hover)`, so a tap on iOS never leaves a link stuck in its hover state. Anything shown on hover is also shown on focus and on tap.
- No `background-attachment: fixed`, no `backdrop-filter`, no scroll hijacking, and no scroll snapping.
- `100svh` comes after a `100vh` fallback, because iOS 15.3 and older do not support `svh`.
- The cartoon's SVG transforms keep explicit pixel `transform-origin` values. Safari ignores `transform-box` on some SVG groups, and the current markup already handles this.
- The figures need the Web Animations API and CSS `scale` and `translate`, which iOS 14.5 and later have. `main.js` keeps its feature check, so older browsers get the finished still.
- Images are served in WebP or JPEG with `srcset`. The photo is lazy-loaded below the first screen, and the hero has no image request other than the inline SVG.
- `theme-color` changes to `#e6e5e0`, so the iOS and Android browser chrome matches the desk.

## Accessibility

- Landmarks: one `header` (the desk bar), `main` with six `section`s, each labelled by its title, and `footer` inside Contact.
- The skip link remains.
- Focus is visible on every control: 2px accent outline, 3px offset.
- Contrast is at least 4.5:1 for text and at least 3:1 for figure strokes against white.
- The cartoon keeps its `role="img"` label. Each figure keeps its text description, written for the new drawings.
- The tablist follows the WAI-ARIA tabs pattern on desktop and the disclosure pattern on phones.

## Files

Removed:
- `css/keyboard.css`, `css/hero.css`, `css/sections.css`, `css/contact.css`, `css/motion.css`
- `js/keyboard.js`, `js/kinetic.js`, `js/countup.js`, `js/shader.js`, `js/tabs.js`, `js/projects.js`, `js/scrollspy.js`

Kept:
- `js/config.js` and `js/wave.js`
- `js/reveal.js`, simplified to the single fade
- `js/reel.js`, mounted by project selection instead of `<details>`
- `js/scenes.js`, recoloured

New or rewritten:

| File | Holds |
| --- | --- |
| `css/base.css` | Tokens, reset, type and utilities, rewritten |
| `css/layout.css` | Desk bar, phone menu, sheet, title block, grid, buttons, links, spec lists |
| `css/sheets.css` | The six sheets' own layouts |
| `css/figures.css` | Figure frames, diagram styling, the cartoon and all keyframes |
| `css/case-study.css` | Restyled to the system: one long sheet at natural height, with the same bar |
| `js/work.js` | The tabs/accordion behaviour and deep links |
| `js/index.js` | Sheet index, scroll position and clock (replaces `scrollspy.js`) |
| `js/menu.js` | The phone menu |
| `js/contact.js` | The copy button |

Content and metadata:
- `index.html`: rewritten markup, same content apart from the cuts and drafts listed above.
- `case-studies/trading-agent.html`: new head (fonts, theme colour) and class names. The text is unchanged.
- `img/og.jpg`: recaptured from the new hero.
- Favicon: an ink square with an accent rule, as inline SVG.
- `README.md`: rewritten for the new structure.
- `.vercelignore`: excludes `docs/`, so specs and plans are not deployed.

No framework, no build step and no dependencies, as now.

## Testing

Automated, run in a local browser before each push:

- **Sheet fit:** a script measures every sheet at 1280 × 650, 1440 × 800 and 1920 × 1080, and fails if any is taller than the viewport minus the bar.
- **Overflow:** a script fails if `document.documentElement.scrollWidth > innerWidth` at 320, 375, 393, 412 and 430px wide.
- **Screenshots:** every sheet at desktop, tablet and phone sizes, reviewed by eye.
- **Lighthouse:** mobile and desktop. Accessibility ≥ 95, performance ≥ 90, best practices ≥ 95.
- **Keyboard:** a walkthrough covering the skip link, the menu, the project tabs with arrow keys, the pause buttons and the copy button.
- **Reduced motion:** checked with emulation; nothing should move.
- **WebKit:** Playwright WebKit if available, then Evan checks on his iPhone 15 before the release is called done.

## Out of scope

- A dark theme. The paper sheet is the identity, so it is left for later if wanted.
- A blog or writing section.
- Any framework, CMS or build tooling.
- New projects or content beyond the edits named here.

## Process

- Work happens on a branch, in small commits with Evan as the only author: no co-author lines.
- Content cuts (About paragraphs, Experience points) and the draft lede go to Evan as a list for approval before the merge.
- Nothing is pushed or deployed until Evan says so.
