# My portfolio

My personal site, laid out as a set of six engineering drawing sheets: Intro, About, Experience, Selected work, Toolkit and credentials, and Contact. Each sheet is one screen on a landscape laptop or desktop and grows to fit its content on phones and tablets.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Run it locally

The scripts are ES modules, so the page has to be served over HTTP. This server turns caching off:

```sh
python3 tests/serve.py 4173
```

Then open <http://localhost:4173>. On a phone on the same Wi-Fi, use the Mac's address instead, from `ipconfig getifaddr en0`.

## Check it

Open <http://localhost:4173/tests/>. The page loads the site at 13 sizes, from a 320px phone to a 1920px desktop, and checks that:

- each sheet fits one screen at 1280 × 650, 1440 × 800 and 1920 × 1080, with each project open and each Toolkit tab chosen in turn, even with fallback fonts
- nothing scrolls sideways
- tap targets are at least 44px below 1024px wide
- the smallest note in a project diagram renders at least 9px at 1280px wide and up, 8px from 1024px and 7px below
- the project list, the Toolkit tabs (roles, arrow keys, Home and End, and the `#education` and `#certifications` links), the menu, the sheet index and the copy button behave, and the page behind the open menu (below 1024px) is inert, so it cannot be tabbed to or clicked

The heading says `PASS` or `FAIL`, and the table lists every result. `docs/` and `tests/` are left out of deploys by `.vercelignore`.

## Change the email address

It lives in one place, `js/config.js`:

```js
export const CONTACT_EMAIL = 'evanyap7@gmail.com';
```

Every email link, the address on the Contact sheet and the copy button read from it.

## Where things are

| Path | What it holds |
| --- | --- |
| `index.html` | All six sheets |
| `case-studies/` | Long-form write-ups, one sheet each |
| `resume/` | The downloadable resume PDF |
| `css/base.css` | Colour, font and type-scale tokens, reset, utilities, the scroll fade |
| `css/layout.css` | The bar and its progress line, the menu below 1024px, the sheet frame, buttons, links and lists |
| `css/sheets.css` | Each sheet's own layout |
| `css/figures.css` | Project diagrams, the cartoon and all keyframes |
| `css/case-study.css` | Case study pages |
| `js/main.js` | Starts everything |
| `js/work.js` | The project list: tabs from 1024px, an accordion below, and `#work-…` links |
| `js/tabs.js` | Sheet 05's four tabs, and the `#education` and `#certifications` links |
| `js/count.js` | Counts a project's figures up the first time it opens |
| `js/lean.js` | Turns the cartoon's head toward the pointer |
| `js/index.js` | The sheet index in the bar and menu, and the progress line |
| `js/menu.js` | The menu below 1024px |
| `js/contact.js` | The copy button |
| `js/wave.js` | Replays the cartoon's wave on hover or tap |
| `js/reel.js`, `js/scenes.js` | The project diagram player and each diagram's timeline |
| `js/reveal.js` | The fade as content first scrolls into view, and each sheet's frame drawing in |
| `img/icons.svg` | Tool marks (Simple Icons), the GitHub and LinkedIn marks (Feather) and the document and envelope line icons, all drawn in `currentColor` |
| `img/logos/` | Univers and SUTD logos |
| `tests/` | The check page and the local server |

## The design

- Paper sheets (`#fafaf7`) on a grey desk (`#e6e5e0`), one ink (`#111214`) and one blue accent (`#2541e6`).
- Type is Switzer for reading, Fragment Mono for labels, Instrument Serif for sheet titles, the About statement, the Contact title and the italic "check they work.", and Satoshi 900 for the `evan.` wordmark. Sizes come from the `--t-…` tokens at the top of `css/base.css`; laptops under 760px tall get a compact set so every sheet still fits one screen.
- Each sheet ends with a link to the next one, so the page reads in order.
- The bar shows which sheet you are on.

To add a project, copy one `h3.project__head` and the `div.project__panel` after it in `index.html`, give both new ids (`work-…`, `row-…` and `panel-…`), and number it in `.project__n`. The Selected work grid assumes six projects (`grid-template-rows: repeat(6, auto) 1fr` in `css/sheets.css`), and the check page asserts six projects captioned Fig. 4.1 to 4.6 (`work` and `figureCaptions` in `tests/checks.js`), so update those too. 4.6 Others gathers the smaller builds; a new major project goes before it.

The marks above each project's stack come from `img/icons.svg` (`<svg class="icon"><use href="img/icons.svg#python"/></svg>`). Only tools with a mark in the file get one; never draw a brand's logo by hand.

## Project diagrams

Four projects have a looping diagram, inline SVG inside a `<figure class="reel" data-reel="…">`, drawn in its finished state so it reads as a still.

To change one, edit its SVG in `index.html` and its timeline in `js/scenes.js`. The timeline finds parts by their `data-a` name and gives times in milliseconds into a nine-second loop. A diagram plays only while its project is open and on screen, and each has a pause button.

Each diagram is drawn in a 480 × 320 viewBox, with labels set at 16 units and notes at 13 in `css/figures.css`. On laptops 1280px wide and up and at most 899px tall, the open project's diagram sits beside its summary, so it stays readable while the sheet still fits one screen.

Fig. 4.6 (Others) is different: two small drawings, piano keys and a moon beside a calendar, animated with plain CSS keyframes in `css/figures.css`. They play once, for under five seconds, each time Others opens, so they need no pause button.

## Motion

- The headline's two lines rise in on load, then the underline draws under "check they work."
- The cartoon waves once on load and again on hover or tap, and with a mouse its head turns a few pixels toward the pointer.
- The Intro has a faint dot grid with a slow lens that brightens the dots it passes, for about half a minute (wide screens only).
- Each sheet's frame draws itself in clockwise, and its label types in, the first time the sheet comes into view.
- A project's panel fades and rises in when it opens, and its figures (and its row's key figure) count up the first time.
- The project diagrams loop while their project is open and on screen, with a pause button. Fig. 4.6 plays once.
- The Toolkit tab's tools rise in, row by row, when the tab is shown.
- A blue line under the bar shows how far down the page you are.

With Reduce Motion on, nothing moves: no animation runs at all, figures and counters show their final values, the frames are drawn, and colour changes land at once.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the Intro sheet if the headline or cartoon changes.

## Deploy

The site is static, so Vercel serves the repository root as it is. The default and production branch is `main-2`: every push to it deploys, and pushes to other branches get preview deployments.
