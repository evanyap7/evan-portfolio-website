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

- each sheet fits one screen at 1280 × 650, 1440 × 800 and 1920 × 1080, even with fallback fonts
- nothing scrolls sideways
- tap targets are at least 44px below 1024px wide
- the smallest note in a project diagram renders at least 9px at 1280px wide and up, 8px from 1024px and 7px below
- the project list, the menu, the sheet index and the copy button behave, and the page behind the open menu (below 1024px) is inert, so it cannot be tabbed to or clicked

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
| `css/base.css` | Colour and type tokens, reset, utilities, the scroll fade |
| `css/layout.css` | The bar, the menu below 1024px, the sheet frame, title block, buttons, links and lists |
| `css/sheets.css` | Each sheet's own layout |
| `css/figures.css` | Project diagrams, the cartoon and all keyframes |
| `css/case-study.css` | Case study pages |
| `js/main.js` | Starts everything |
| `js/work.js` | The project list: tabs from 1024px, an accordion below, and `#work-…` links |
| `js/index.js` | The sheet index in the bar and menu, and the Singapore clock |
| `js/menu.js` | The menu below 1024px |
| `js/contact.js` | The copy button |
| `js/wave.js` | Replays the cartoon's wave on hover or tap |
| `js/reel.js`, `js/scenes.js` | The project diagram player and each diagram's timeline |
| `js/reveal.js` | The fade as content first scrolls into view |
| `tests/` | The check page and the local server |

## The design

- Paper sheets (`#fafaf7`) on a grey desk (`#e6e5e0`), one ink (`#111214`) and one blue accent (`#2541e6`).
- Type is Switzer, with Fragment Mono for labels.
- Each sheet ends with a link to the next one, so the page reads in order.
- The bar shows which sheet you are on.

To add a project, copy one `h3.project__head` and the `div.project__panel` after it in `index.html`, give both new ids (`work-…`, `row-…` and `panel-…`), and number it in `.project__n`. The Selected work grid assumes five projects (`grid-template-rows: repeat(5, auto) 1fr` and `.also`'s `grid-row: 6` in `css/sheets.css`), and the check page asserts five projects captioned Fig. 4.1 to 4.5, so update those too.

## Project diagrams

Four projects have a looping diagram, inline SVG inside a `<figure class="reel" data-reel="…">`, drawn in its finished state so it reads as a still.

To change one, edit its SVG in `index.html` and its timeline in `js/scenes.js`. The timeline finds parts by their `data-a` name and gives times in milliseconds into a nine-second loop. A diagram plays only while its project is open and on screen, and each has a pause button.

Each diagram is drawn in a 480 × 320 viewBox, with labels set at 16 units and notes at 13 in `css/figures.css`. On laptops 1280px wide and up and at most 799px tall, the open project's diagram sits beside its summary, so it stays readable while the sheet still fits one screen.

## Motion

The cartoon waves once on load and again on hover or tap, the headline's underline draws once, and the project diagrams loop. With Reduce Motion on, nothing moves: the diagrams show their finished state, and the cartoon's caption says it is still on purpose.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the Intro sheet if the headline or cartoon changes.

## Deploy

The site is static, so Vercel serves the repository root as it is. Every push to `main` deploys.
