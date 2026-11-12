// The page as a deck of sheets (css/editions.css): one pass per scrolled
// frame. The rail docks once the hero has passed; on a screen that pins them,
// the hero and the Projects opener darken and draw back a little as the next
// sheet covers them; and the suit and its figures drift at their own rates.
// It also tells the scene (lab.js) when the hero is covered, so the hero's
// loop does not play behind a sheet.

import { whenActive } from './gate.js';

const unit = (value) => Math.max(0, Math.min(1, value));

export function initDeck() {
  const hero = document.getElementById('top');
  const about = document.getElementById('about');
  if (!hero || !about) return;

  const root = document.documentElement;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pinned = window.matchMedia('(min-width: 1024px) and (min-height: 700px)');
  const narrow = window.matchMedia('(max-width: 1023px)');
  const opener = document.querySelector('#work .opener');
  const paper = document.querySelector('#work .paper');
  const stage = document.querySelector('#work .opener__stage');
  const drifters = still ? [] : [...document.querySelectorAll('[data-drift]')];
  let covered = null;

  const frame = () => {
    const vh = window.innerHeight;
    // Behind the gate a phone's sections are out of the flow (reactor.css), so
    // About's box says nothing: the hero is on screen and uncovered.
    const top = root.classList.contains('gated') ? vh : about.getBoundingClientRect().top;
    root.classList.toggle('docked', top < vh * 0.3);

    const pin = pinned.matches && !still;
    hero.style.setProperty('--cover', (pin ? unit(1 - top / vh) : 0).toFixed(3));
    const cover = pin && paper ? unit(1 - paper.getBoundingClientRect().top / vh) : 0;
    opener?.style.setProperty('--cover', cover.toFixed(3));

    // Once About's top has reached the top of the screen the hero is out of
    // sight, pinned under the sheets or scrolled away. A link to About stops
    // short of the top (its scroll margin clears a phone's bar), so a strip
    // that thin counts as covered.
    const now = top <= Math.min(96, vh * 0.12);
    if (now !== covered) {
      covered = now;
      root.classList.toggle('hero-covered', now);
      document.dispatchEvent(new CustomEvent('deck:cover', { detail: now }));
    }

    if (!drifters.length || !stage) return;
    if (narrow.matches) {
      // The stacked layout: nothing floats.
      drifters.forEach((node) => { node.style.transform = ''; });
      return;
    }
    const r = stage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const off = Math.max(-360, Math.min(360, r.top + r.height / 2 - vh / 2)) + cover * 260;
    drifters.forEach((node) => {
      node.style.transform = `translate3d(0, ${(off * parseFloat(node.dataset.drift)).toFixed(1)}px, 0)`;
    });
  };

  let queued = 0;
  const schedule = () => {
    if (queued) return;
    queued = window.requestAnimationFrame(() => {
      queued = 0;
      frame();
    });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // Waking puts the sections back in the flow without a scroll or a resize.
  whenActive(schedule);

  // A pinned hero never leaves the screen; it is only covered. Focus that
  // moves into it (Shift+Tab back from About) brings it back into view. The
  // browser scrolls the focused element into view after `focusin`, so the
  // return waits a frame or that scroll would undo it.
  hero.addEventListener('focusin', () => {
    if (!pinned.matches || still) return;
    window.requestAnimationFrame(() => {
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'auto' });
    });
  });

  frame();
}
