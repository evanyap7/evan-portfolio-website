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
| `css/base.css` | Colour and type tokens, reset, shared utilities |
| `css/hero.css` | Header and hero headline |
| `css/keyboard.css` | The keyboard and its press states |
| `css/marquee.css` | The scrolling strip under the keyboard |
| `css/sections.css` | Work, about, experience and toolkit |
| `css/contact.css` | Contact section and footer |
| `js/keyboard.js` | Automatic key-press sequence |
| `js/marquee.js` | Fills the strip and sets its speed |
| `js/reveal.js` | Fade-in on scroll |
| `js/shader.js` | WebGL backdrop behind the contact section, loaded on demand |

To add a project, copy one `<li class="project">` block in `index.html` and edit it.

## Deploy

The site is static, so Vercel serves the repository root as it is. Every push to `main` deploys.

## Accessibility notes

- Every key is a real link with its own accessible name, reachable by keyboard.
- With `prefers-reduced-motion`, the key sequence, marquee, scroll fades and WebGL backdrop are all switched off, and the marquee text is shown as a static line.
- The marquee sentence is exposed to screen readers once; the moving copies are hidden from them.
