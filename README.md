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
- no stylesheet or diagram uses an old colour and the page is black; every text grey (`--text`, `--text-2`, `--muted`, `--dim`) passes 4.5:1 on black, on both band greys and on the head of a card, the light Contact band's greys and dark pills pass too, and the focus ring passes 3:1 on dark and on light (all computed from the tokens)
- no em dash appears in the text, title or meta
- About shows the photo, with alt text, and the Selected work cards sit at or below the title's baseline, so they never cover its letters
- the six work cards are single links, named by their titles, with their `#work-…` ids, and each page they open exists
- the Toolkit tabs (roles, arrow keys, Home and End, and the `#education` and `#certifications` links), the nav's current section, the progress line, the menu (the page and footer behind it are inert, and Escape closes it) and the copy button behave
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
| `index.html` | The main page: Intro, About, Experience, Selected work, Toolkit and Contact |
| `work/` | One page per project: `website-revamp`, `assistant-bot`, `research-agent`, `v-bay` and `others` |
| `case-studies/trading-agent.html` | The trading agent's case study, on the same template |
| `resume/` | The downloadable resume PDF |
| `css/base.css` | Colour, font and type tokens, reset, the accent serif, utilities, the scroll reveal |
| `css/layout.css` | The floating nav, the progress line, the menu, sections and their huge titles, pills, cards, hairline rows and the footer |
| `css/home.css` | The main page's sections |
| `css/project.css` | The project page template |
| `css/case-study.css` | The case study's article: pipeline, decisions and tables |
| `css/figures.css` | Project diagrams and the keyframes |
| `js/main.js` | Starts everything; every page loads it, and each part does nothing on a page without its markup |
| `js/index.js` | The nav's current section and the progress line |
| `js/menu.js` | The menu below 1024px |
| `js/tabs.js` | The Toolkit tabs, and the `#education` and `#certifications` links |
| `js/count.js` | Counts each `[data-count]` figure up once, the first time it is seen |
| `js/contact.js` | The copy button |
| `js/reveal.js` | The fade and rise as content first scrolls into view |
| `js/reel.js`, `js/scenes.js` | The project diagram player and each diagram's timeline |
| `img/icons.svg` | Tool marks (Simple Icons), the GitHub and LinkedIn marks (Feather) and the document and envelope line icons, all drawn in `currentColor` |
| `img/logos/` | Univers and SUTD logos, turned white in CSS |
| `tests/` | The check page and the local server |

## The design

- One greyscale ramp, `--grey-950` (`#000`) to `--grey-50` (`#fafafa`), at the top of `css/base.css`. Everything else is named from it: the bands (`#000`, `#0b0b0b`, `#111`), cards on a gradient from `--card-top` (`#141414`) to `--card` (`#0b0b0b`) with a lighter top edge, two hairlines (`--line`, `--line-2`) and four text greys (`--text #fafafa`, `--text-2 #d4d4d4`, `--muted #a1a1a1`, `--dim #808080`).
- Sections are bands (`.band`, `.band--900`, `.band--850`) painted edge to edge with a faint hairline where they meet. Contact and the footer are the one light band (`.band--light`, `#f4f4f2`), which redefines the tokens so text turns near-black and the pills dark.
- One blue, `--signal #6d86ff`, used only in the diagrams and as the focus ring on dark; on the light band the ring is near-black.
- Type: Geist 400, 500 and 600 for reading, UI and headings; Geist Mono for labels and dates; Instrument Serif italic for one accent word at a time (`.serif`, about 1.08 times the sans around it); Satoshi 900 for the `evan.` wordmark only. Geist, Geist Mono and Instrument Serif come from Google Fonts and Satoshi from Fontshare, with fallback stacks in `--font-sans`, `--font-mono` and `--font-serif`.
- Section titles are huge (`--t-title`, 60px to 176px), centred, with one whole word in the serif. In Selected work the cards are tucked over the bottom of the title.
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

- The hero rises in, one line after another, on load.
- Content fades and rises in the first time it scrolls into view.
- Each project's figures count up once, the first time they are seen.
- A newly chosen Toolkit tab fades and rises in.
- The project diagrams loop while on screen, with a pause button; Others plays once.
- A thin grey line along the top of the screen shows how far down the page you are.

With Reduce Motion on, nothing moves: no animation runs at all, the figures show their final values and colour changes land at once.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the hero if the headline changes.

## Deploy

The site is static, so Vercel serves the repository root as it is, with `cleanUrls` on (so `/work/assistant-bot.html` is also `/work/assistant-bot`). The default and production branch is `main-2`: every push to it deploys, and pushes to other branches get preview deployments.
