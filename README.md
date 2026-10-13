# My portfolio

My personal site: a one-page portfolio built around a keyboard that spells PORTFOLIO. Each key takes you somewhere.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Run it locally

The scripts are ES modules, so the page needs to be served over HTTP rather than opened as a file:

```sh
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Change the email address

The address lives in one place, `js/config.js`:

```js
export const CONTACT_EMAIL = 'evanyap7@gmail.com';
```

The header's "Let's talk" button, the Enter key and the link in the contact section all read from it.

## Where things are

| Path | What it holds |
| --- | --- |
| `index.html` | All content: projects, about, experience, toolkit |
| `case-studies/` | Long-form write-ups, one page per project |
| `resume/` | The downloadable resume PDF |
| `css/base.css` | Colour and type tokens, reset, shared utilities |
| `css/hero.css` | Header, hero headline, the one primary button and the credentials line |
| `css/keyboard.css` | The keyboard, its press states and the phone readout |
| `css/marquee.css` | The scrolling strip under the keyboard |
| `css/sections.css` | Work, about, experience, toolkit and tabs |
| `css/case-study.css` | Case study pages |
| `css/contact.css` | Contact section and footer |
| `css/motion.css` | Kinetic type, the Toolkit chip stagger, the hero cartoon, and the frame and parts of the project diagrams |
| `js/keyboard.js` | Automatic key-press sequence, typing on the keys, key sounds and the phone readout |
| `js/marquee.js` | Fills the strip and sets its speed |
| `js/reveal.js` | Fade-in on scroll, and the trigger for kinetic type |
| `js/kinetic.js` | Splits titles into words or letters so they can come in one at a time |
| `js/wave.js` | Replays the hero cartoon's wave on hover or tap |
| `js/reel.js` | Plays the looping project diagrams, loaded on demand |
| `js/scenes.js` | The timeline for each diagram |
| `js/tabs.js` | The Experience, Story and Toolkit tabs, including deep links |
| `js/projects.js` | Project cards: the cursor highlight, and keeping an opened card on screen |
| `js/countup.js` | Rolls the larger figures up to their value when first seen |
| `js/scrollspy.js` | Marks the current section in the header nav |
| `js/shader.js` | WebGL backdrop behind the contact section, loaded on demand |

To add a project, copy one `<li class="project">` block in `index.html` and edit it.

## The hero's order of attention

The hero is built to be read in one order: the headline, one sentence, one button, then a quiet line of logos and highlights, then the keyboard.

- From 1000px wide, a cartoon of me sits beside the headline. It is inline SVG in `index.html`, styled and animated in `css/motion.css`. It waves once as "Hi, I'm Evan." lands, then only blinks, so it greets with the headline instead of pulling against it. Hovering or tapping it waves again.
- Yellow means the resume. It is on the hero button and the Resume key, and nowhere else in the hero.
- The keys rest in a paler wash of their colour so their labels lead, and take the full colour when hovered, focused or pressed.
- Below 720px the keys are too small for labels, so a readout under the keyboard names each key as the sequence presses it, at a slower pace. With reduced motion there is no sequence, so the small labels stay on the keys.

## Project diagrams

Four project cards carry a looping diagram of how the project works. Each one is inline SVG inside a `<figure class="reel" data-reel="…">`, drawn in its finished state, so it reads correctly as a still.

To change one, edit its SVG in `index.html` and its timeline in `js/scenes.js`. The timeline finds parts by their `data-a` name and gives times in milliseconds into a nine-second loop. To add one, copy a `<figure class="reel">`, give it a new `data-reel` name, and add a function of that name to `SCENES`.

Anything hidden in the still, such as a moving dot, has `opacity="0"` in the SVG. The timeline overrides it while playing.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the hero if the headline or keyboard changes.

## Deploy

The site is static, so Vercel serves the repository root as it is. Every push to `main` deploys.

## Accessibility notes

- Every key is a real link with its own accessible name, reachable by keyboard.
- With `prefers-reduced-motion`, the key sequence, marquee, scroll fades, kinetic type and WebGL backdrop are all switched off, the marquee text is shown as a static line, and the project diagrams are shown as stills.
- Each project diagram has a pause button and a text description for screen readers. It only plays while its card is open and on screen.
- Titles that animate word by word are read out as the original sentence; the animated copy is hidden from screen readers.
- The marquee sentence is exposed to screen readers once; the moving copies are hidden from them.
