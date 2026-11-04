# Evan Yap: Portfolio

**Live:** <https://www.evanyap.com>

The page is **Tony Stark's lab**. One fixed three.js canvas holds the whole room, and scrolling moves a camera along a rail through the sections (Intro, About, Experience, Selected work, Toolkit, Contact), with a page for each project. Plain HTML, CSS and JavaScript as ES modules: no framework and no build step. The only npm packages are dev tools for the checks. three.js and the fonts load from CDNs. Where WebGL2 is missing, or Reduce Motion is on, the same content shows as an ordinary page.

![The lab's vault door opening onto Tony Stark's workshop, with a hologram of Evan inside](docs/hero.png)

![The Hall of Armor: a suit in its bay, with the project beside it and the other six suits to pick from](docs/hall.png)

## Highlights

- **A lab you scroll through.** The camera flies a rail through the room. The reactor on the first screen is the door: a first visit finds it shut ("Systems offline"). Press and hold the reactor (or hold Space on it) and it charges; at 100% it fires a pulse and the door opens. It never opens by itself, so the resume and email stay reachable throughout.
- **Interactive 3D arc reactor** in three.js: powers on with a pulse, hold to charge, drag to spin, highlights follow the pointer.
- **The Hall of Armor.** Selected work stands in the lab as seven Iron Man suits, each fully lit and drag-to-turn, with its own readouts and the project it stands for. On a phone the whole suit is framed under the nav.
- **A trophy shelf you can click all the way down Experience.** Fourteen objects (roles, awards, the scholarship) each open a card. On a wide screen the shelf stays clickable down the whole section, and hovering an object selects its row on the page and the other way round. On a phone it pins as a strip at the top while Experience scrolls under it, and the entry being read lights its trophy.
- **Looping project diagrams** drawn as inline SVG, played only while on screen, each with a pause button.
- **Motion with restraint.** Word-by-word title reveals, counting figures, scroll-drawn timeline, cross-page view transitions. With Reduce Motion on, nothing moves.
- **Tested in the browser.** [`/tests/`](tests/) loads the site at 13 sizes (320px to 1920px) and runs about 7,000 checks: section order, heading levels, no sideways scroll, 44px tap targets, WCAG contrast, focus rings, keyboard paths, the gate, and the lab's camera, suits and shelf.

## How it was built

I designed and directed this site and built it with AI coding assistants, mainly Claude Code. The browser checks in [`/tests/`](tests/) are how I check what they write. The working notes, plans and specs from that process are kept in [`docs/superpowers/`](docs/superpowers/).

## Run it

Scripts are ES modules, so serve over HTTP:

```sh
python3 tests/serve.py 4173      # then open http://localhost:4173 (and /tests/ for the checks)
npm install                      # once: installs the git hooks and the browser-check runner
npm run check                    # JavaScript syntax and the lab's unit tests, fast
npm run check:browser            # the full headless-Chrome suite, about 9 minutes
```

## Where things are

| Path | Holds |
| --- | --- |
| `index.html` | Main page: hero, About, Experience, Selected work, Toolkit, Contact |
| `work/`, `case-studies/` | One page per project, and the trading agent case study |
| `css/` | `base.css` (tokens), `layout.css`, `home.css`, `project.css`, `figures.css`, `reactor.css` |
| `js/` | `main.js` starts everything; `reactor*.js` the hero's 3D model; `gate.js`, `motion.js`, `reel.js` + `scenes.js` (diagram player) |
| `js/lab.js`, `js/lab/` | The lab: the camera rail, room, props, suits, hologram, door and clickable spots |
| `js/hall*.js`, `models/hall/` | The Hall of Armor: the suit picker, its stage and the suit models |
| `img/`, `resume/` | Icons, logos, share image, resume PDF |

## Maintaining it

- **Email:** change `CONTACT_EMAIL` in `js/config.js`; every link and the copy button read from it.
- **Add a project:** copy a page in `work/`, add a card to `ul.work__grid` in `index.html`, fix the "Next project" loop, list it in `sitemap.xml`, and add it to `PAGES` and `CARDS` in `tests/`.
- **Resume:** replace `resume/Evan-Yap-Resume.pdf`, with the phone number removed from the file itself (covering it with a box is not enough).
- **Share image:** recapture `img/og.jpg` (1200 x 630) if the hero changes.
- **Design:** one hue (`--h`, arc blue) tints the whole palette; tokens live at the top of `css/base.css`. Type is Schibsted Grotesk, Azeret Mono, Bodoni Moda and Satoshi.

## Deploy

Static, served by Vercel from the repo root with `cleanUrls` on. The default branch on GitHub is `tony-stark`. Vercel deploys whichever branch its project settings name as Production; other branches get previews.

## License

The code is [MIT](LICENSE). The writing, photos and resume are mine and are not covered by it.
