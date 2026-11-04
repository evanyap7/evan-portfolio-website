// The way in. On a first visit the main page opens dark, with only the arc
// reactor, unpowered. Press and hold it (pointer, or Space/Enter on its
// button) and it charges; let go early and it drains back down. At 100%
// it fires a pulse, and the site, and the lab behind it, power on. With
// reduced motion a single press is enough. The gate never opens by itself:
// the resume and email stay in reach the whole time instead.
//
// The head script in index.html decides whether to gate before the first
// paint (the `gated` class): never with a link to a section (#work and so
// on), never twice in one browser session, and never without module
// support. It also lifts the gate by itself if this file has not taken
// over within a few seconds, so a failed script cannot lock anyone out.

const KEY = 'portfolio-on';
// The charge's pace, shared with the 3D reactor (reactor-scene.js) so the
// model and the meter fill together: full in 1.4 s, empty in under half.
export const CHARGE_S = 1.4;
export const DRAIN_PER_S = 2.2;
const root = document.documentElement;

// Runs fn once the site is awake: at once if it already is.
export function whenActive(fn) {
  if (!root.classList.contains('gated')) fn();
  else document.addEventListener('portfolio:activate', () => fn(), { once: true });
}

export function initGate() {
  const gate = document.querySelector('[data-gate]');
  const hit = document.querySelector('[data-reactor-hit]');
  if (!gate || !hit || !root.classList.contains('gated')) return;
  root.classList.add('gate-ready');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const status = gate.querySelector('[data-gate-status]');
  const meter = gate.querySelector('[data-gate-meter]');
  // Everything but the reactor, the resume and email is out of reach until
  // the site wakes.
  const asleep = [
    ...document.querySelectorAll('.skip-link, .nav, .menu, main > section:not(.hero), .footer'),
    ...document.querySelectorAll('.hero__name, .reactor__panel, .hero__title, .hero__lede, .hero__creds'),
  ];
  asleep.forEach((el) => { el.inert = true; });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const label = hit.getAttribute('aria-label');
  hit.setAttribute('aria-label', reduce
    ? 'Arc reactor. Press it to power it up and enter the site.'
    : 'Arc reactor. Press and hold it to power it up and enter the site.');

  let awake = false;
  let holding = false;
  let power = 0;
  let last = 0;
  let frame = 0;
  const say = (text) => { if (status.textContent !== text) status.textContent = text; };
  const show = () => {
    root.style.setProperty('--charge', power.toFixed(3));
    meter.textContent = `${Math.round(power * 100)}%`;
  };

  const activate = () => {
    if (awake) return;
    awake = true;
    holding = false;
    power = 1;
    show();
    cancelAnimationFrame(frame);
    root.classList.remove('charging');
    document.dispatchEvent(new CustomEvent('gate:charge', { detail: false }));
    say('Access granted');
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      // Storage can be blocked; the gate then shows again on the next visit.
    }
    asleep.forEach((el) => { el.inert = false; });
    hit.setAttribute('aria-label', label);
    root.classList.add('waking');
    // The pulse: a flash of the reactor's light over the whole screen.
    if (!reduce) {
      const flash = document.createElement('span');
      flash.className = 'gate-flash';
      flash.setAttribute('aria-hidden', 'true');
      document.body.append(flash);
      flash.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0 }], {
        duration: 1100, easing: 'ease-out',
      }).finished.finally(() => flash.remove());
    }
    // The reactor fires its pulse now; the page follows it up.
    document.dispatchEvent(new Event('portfolio:waking'));
    window.setTimeout(() => {
      root.classList.remove('gated');
      root.style.removeProperty('--charge');
      document.dispatchEvent(new Event('portfolio:activate'));
    }, reduce ? 0 : 500);
    window.setTimeout(() => root.classList.remove('waking'), reduce ? 0 : 2400);
  };

  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    power = holding ? Math.min(1, power + dt / CHARGE_S) : Math.max(0, power - dt * DRAIN_PER_S);
    show();
    if (power >= 1) {
      activate();
      return;
    }
    if (holding || power > 0) frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (awake) return;
    if (reduce) {
      activate();
      return;
    }
    if (holding) return;
    holding = true;
    root.classList.add('charging');
    document.dispatchEvent(new CustomEvent('gate:charge', { detail: true }));
    say('Charging');
    cancelAnimationFrame(frame);
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (!holding) return;
    holding = false;
    root.classList.remove('charging');
    document.dispatchEvent(new CustomEvent('gate:charge', { detail: false }));
    if (!awake) say('Power lost. Hold until it reaches 100%.');
  };

  hit.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || awake) return;
    try {
      hit.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks; the press still counts.
    }
    start();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => hit.addEventListener(type, stop));
  hit.addEventListener('contextmenu', (event) => { if (!awake) event.preventDefault(); });
  hit.addEventListener('keydown', (event) => {
    if (awake || (event.key !== ' ' && event.key !== 'Enter')) return;
    event.preventDefault();
    if (!event.repeat) start();
  });
  hit.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') stop();
  });
  hit.addEventListener('blur', stop);
}
