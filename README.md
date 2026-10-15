# My portfolio

My personal site: one black page in six sections (Intro, About, Experience, Selected work, Toolkit and Contact), plus a page for each project. The sections flow one after another with generous space between them; nothing is pinned to one screen.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Run it locally

The scripts are ES modules, so the pages have to be served over HTTP. This server turns caching off:

```sh
python3 tests/serve.py 4173
```

Then open <http://localhost:4173>. On a phone on the same Wi-Fi, use the Mac's address instead, from `ipconfig getifaddr en0`.

## Check it

Open <http://localhost:4173/tests/>. The page loads the site at 13 sizes, from a 320px phone to a 1920px desktop, and checks that:

- the six sections are in order (`top`, `about`, `experience`, `work`, `toolkit`, `contact`), each page has one `h1` and its headings never skip a level
- the drawing set is gone: no sheets, ticks, title blocks, "Next:" links, underline stroke, dot grid, project tabs, Switzer, Fragment Mono, `lean.js`, `work.js` or `backdrop-filter`
- nothing scrolls sideways, on the main page and on every project page and the case study
- Geist, Geist Mono, Instrument Serif and Satoshi load
- tap targets are at least 44px below 1024px wide (nav, menu, pills, cards, tabs, the copy button, the contact links, the way back and the next project)
- no stylesheet or diagram uses an old colour and the page is near-black; every text grey (`--text`, `--text-2`, `--muted`, `--dim`) passes 4.5:1 on black, on both band greys and on the head of a card, the light Contact band's greys and dark pills pass too, and the focus ring passes 3:1 on dark and on light (all computed from the tokens)
- no em dash appears in the text, title or meta
- About shows the photo, with alt text, and its four-figure proof strip; the Selected work cards sit at or below the title's baseline, so they never cover its letters
- the titles read exactly as written after the word reveal splits them (nothing in a heading is `aria-hidden`), and every word is in place once seen
- the card spotlight and the magnetic pills are only set up for a fine pointer that can hover
- the Experience timeline is whole once the section has scrolled past, and each role's node lights
- the six work cards are single links, named by their titles, with their `#work-…` ids, and each page they open exists
- the Toolkit tabs (roles, arrow keys, Home and End, and the `#education` and `#certifications` links), the nav's current section, the progress line, the menu (the page and footer behind it are inert, and Escape closes it) and the copy button behave
- the hero's arc reactor has a decorative still and is one labelled button; its five colour cells retint the site through `--h`, remember the choice and mark one cell pressed (the check resets to arc blue after); from 1024px the credentials hang off the reactor as callouts inside the hero, clear of the name and each other, and below that they are a plain list
- each project page links back to all work and on to a next project that exists, and the smallest diagram note renders at least 9px from 1280px wide, 8px from 1024px and 7px below

The heading says `PASS` or `FAIL`, and the table lists every result. `docs/` and `tests/` are left out of deploys by `.vercelignore`.

## Change the email address

It lives in one place, `js/config.js`:

```js
export const CONTACT_EMAIL = 'evanyap7@gmail.com';
```

Every email link, the address in Contact and the copy button read from it.

## Where things are

| Path | What it holds |
| --- | --- |
| `index.html` | The main page: the hero with the arc reactor, About, Experience, Selected work, Toolkit and Contact |
| `work/` | One page per project: `website-revamp`, `assistant-bot`, `research-agent`, `v-bay` and `others` |
| `case-studies/trading-agent.html` | The trading agent's case study, on the same template |
| `resume/` | The downloadable resume PDF |
| `css/base.css` | Colour, font and type tokens, reset, the accent serif, utilities, the scroll reveal |
| `css/layout.css` | The floating nav, the progress line, the menu, sections and their huge titles, pills, cards, hairline rows and the footer |
| `css/home.css` | The main page's sections |
| `css/project.css` | The project page template |
| `css/case-study.css` | The case study's article: pipeline, decisions and tables |
| `css/figures.css` | Project diagrams and the keyframes |
| `css/reactor.css` | The arc reactor, its colour cells and status line, the pulse, and the hero's callouts |
| `js/main.js` | Starts everything; every page loads it, and each part does nothing on a page without its markup |
| `js/index.js` | The nav's current section and the progress line |
| `js/menu.js` | The menu below 1024px |
| `js/tabs.js` | The Toolkit tabs, and the `#education` and `#certifications` links |
| `js/count.js` | Counts each `[data-count]` figure up once, the first time it is seen |
| `js/contact.js` | The copy button |
| `js/reveal.js` | The fade and rise as content first scrolls into view |
| `js/reactor.js` | The reactor's page side: loading the model, charge and pulse, drag to spin, facing the pointer, the colour cells and placing the callouts |
| `js/reactor-scene.js` | The reactor itself in three.js: the model, its materials and lights, bloom, and each frame |
| `js/motion.js` | The masked title reveals, the Experience timeline, and (mouse and trackpad only) the card spotlight and Contact's magnetic pills |
| `js/reel.js`, `js/scenes.js` | The project diagram player and each diagram's timeline |
| `img/icons.svg` | Tool marks (Simple Icons), the GitHub and LinkedIn marks (Feather) and the document and envelope line icons, all drawn in `currentColor` |
| `img/logos/` | Univers and SUTD logos, turned white in CSS |
| `img/reactor.webp` | A still of the reactor, shown until the model draws and wherever WebGL2 is missing |
| `tests/` | The check page and the local server |

## The design

- One hue, `--h` (205, arc blue, by default), tints the whole palette at the top of `css/base.css`: a ramp from `--grey-950` (near-black) to `--grey-50` (near-white), every step leaning a little toward the hue at the lightness of a plain grey ramp. Everything else is named from it: the bands, cards on a gradient from `--card-top` to `--card` with a lighter top edge, two hairlines (`--line`, `--line-2`) and four text greys (`--text`, `--text-2`, `--muted`, `--dim`). Visitors can change `--h` with the reactor's colour cells (arc blue, teal, violet, gold, crimson); the choice is kept in `localStorage` (`reactor-hue`) and each page's head script restores it before the first paint.
- `--accent` is the same hue at full strength: the italic serif words, the wordmark's dot, the focus ring, the diagrams (`--signal`) and the card spotlight. On the light band it turns a deep shade so it still reads.
- Sections are bands (`.band`, `.band--900`, `.band--850`) painted edge to edge with a faint hairline where they meet. Contact and the footer are the one light band (`.band--light`), which redefines the tokens so text turns near-black and the pills dark.
- Type: Geist 400, 500 and 600 for reading, UI and headings; Geist Mono for labels and dates; Instrument Serif italic for one accent word at a time (`.serif`, about 1.08 times the sans around it); Satoshi 900 for the `evan.` wordmark only. Geist, Geist Mono and Instrument Serif come from Google Fonts and Satoshi from Fontshare, with fallback stacks in `--font-sans`, `--font-mono` and `--font-serif`.
- Section titles are huge (`--t-title`, 60px to 176px), centred, with one whole word in the serif. In Selected work the cards are tucked over the bottom of the title.
- The hero's anchor is an arc reactor, modelled in three.js (loaded from jsDelivr through the import map in `index.html`): a machined steel housing with rim screws, ten copper coils wound turn by turn, a chrome inner ring with hex bolts and a glass-domed emitter, lit by its own core, a studio environment and a key light that follows the pointer, with bloom on the brightest parts. The name sits either side of it. The canvas is cleared to the page colour and fades out at its edges, and it only renders while the hero is on screen.
- The nav is a floating pill with a solid background. Below 1024px it holds the wordmark and a Menu pill that opens a full-screen menu.
- Hover styles sit inside `@media (hover: hover)`.

## Add a project

1. Copy one of the pages in `work/`, change its `<title>`, description, canonical and `og:url`, its label, title, figures, diagram, overview, stack and links.
2. Add a card to `ul.work__grid` in `index.html` with the id `work-<slug>`, and point the card before it and the page before it at the new page from their "Next project" links, so the six still run in a loop.
3. Add the page to `PAGES` and its slug to `CARDS` in `tests/`.

## Project diagrams

Four projects have a looping diagram: inline SVG inside a `<figure class="reel" data-reel="…">` on the project page, drawn in its finished state so it reads as a still. To change one, edit its SVG and its timeline in `js/scenes.js`. The timeline finds parts by their `data-a` name and gives times in milliseconds into a nine-second loop. A diagram plays only while it is on screen, and each has a pause button. Each is drawn in a 480 × 320 viewBox, with labels set at 16 units and notes at 13. Colours are named by role (`is-signal`, `stroke-text` and so on, in `css/figures.css`), and the timelines read the same tokens.

Others has two small drawings instead, piano keys and a moon beside a calendar, animated with plain CSS keyframes. They play once, for under five seconds, the first time the plate is seen, so they need no pause button.

## Motion

- Titles (the hero, every section title and the project page titles) reveal word by word from behind a mask, about 60ms apart, with the italic accent word arriving last and settling from a slight skew. The hero's runs on load, the rest when they come into view. The words are wrapped in spans, but the text is untouched, so headings read the same to screen readers.
- The arc reactor powers on with a few flickers, then shimmers faintly while its coils turn slowly. Hold it (or press Space or Enter on it) to charge it: its glow builds, the coils spin up, it shakes at full power, and the status line counts the charge. Let go and it fires a pulse, a ring of light that runs across the hero while the name catches the flash. Drag it to spin it; with a mouse it turns to face the pointer, so the highlights slide across the metal. The colour cells retint it and the site at once.
- Content fades and rises in the first time it scrolls into view; the About photo is wiped in from the top instead.
- Figures count up once, the first time they are seen: the work cards, About's proof strip and each project page's figures.
- A thin timeline beside Experience draws down as the section scrolls past, and each role's node lights as the role comes into view.
- With a mouse or trackpad, a soft spotlight and a brighter stretch of border follow the pointer over a card, the card lifts 3px and its arrow slides; Contact's pills lean up to 6px toward the pointer.
- A newly chosen Toolkit tab fades and rises in.
- The project diagrams loop while on screen, with a pause button; Others plays once.
- Between the main page and the project pages, browsers with cross-document view transitions fade and slide the page, and a work card's title morphs into the project page's title. Other browsers simply navigate.
- A thin grey line along the top of the screen shows how far down the page you are.

With Reduce Motion on, nothing moves: no animation runs at all, the reactor is a fully powered still (only its colour cells work), the figures show their final values and colour changes land at once.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the hero (at 1200 × 630, without the status line, lede and buttons) if the hero changes.

## Deploy

The site is static, so Vercel serves the repository root as it is, with `cleanUrls` on (so `/work/assistant-bot.html` is also `/work/assistant-bot`). The default and production branch is `main-2`: every push to it deploys, and pushes to other branches get preview deployments.
