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
| `css/hero.css` | Header and hero headline |
| `css/keyboard.css` | The keyboard and its press states |
| `css/marquee.css` | The scrolling strip under the keyboard |
| `css/sections.css` | Work, about, experience, toolkit and tabs |
| `css/case-study.css` | Case study pages |
| `css/contact.css` | Contact section and footer |
| `js/keyboard.js` | Automatic key-press sequence |
| `js/marquee.js` | Fills the strip and sets its speed |
| `js/reveal.js` | Fade-in on scroll |
| `js/tabs.js` | The Experience, Story and Toolkit tabs, including deep links |
| `js/projects.js` | Project cards: the cursor highlight, and keeping an opened card on screen |
| `js/countup.js` | Rolls the larger figures up to their value when first seen |
| `js/scrollspy.js` | Marks the current section in the header nav |
| `js/shader.js` | WebGL backdrop behind the contact section, loaded on demand |

To add a project, copy one `<li class="project">` block in `index.html` and edit it.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the hero if the headline or keyboard changes.

## Deploy

The site is static, so Vercel serves the repository root as it is. Every push to `main` deploys.

## Accessibility notes

- Every key is a real link with its own accessible name, reachable by keyboard.
- With `prefers-reduced-motion`, the key sequence, marquee, scroll fades and WebGL backdrop are all switched off, and the marquee text is shown as a static line.
- The marquee sentence is exposed to screen readers once; the moving copies are hidden from them.
