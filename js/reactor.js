// The hero's arc reactor, page side: a toy beside the name, never in the
// way. The 3D model (reactor-scene.js, with three.js from the CDN in the
// import map) loads after the page, over a still of itself, and only where
// WebGL2 works; otherwise the still stays. Hold the reactor (pointer, or
// Space/Enter on its button) to charge it, and let go to fire a pulse; drag
// it to spin it; with a mouse it also turns to face the pointer. With
// reduced motion the reactor is a fully powered still.

import { CHARGE_S } from './gate.js';

const LINES = ['Pulse away.', 'Repulsor fired.', 'Systems nominal.', 'Again?', 'Nice one.'];
// At rest the line under the reactor says what it does.
const HINT = 'Hold to charge';
// Left alone it gives itself a small pulse a few times, then rests.
const NUDGES = 2;
const NUDGE_MS = 7000;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

function webgl2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

export function initReactor() {
  const root = document.querySelector('[data-reactor]');
  if (!root) return;
  const hero = root.closest('.hero');
  const hit = root.querySelector('[data-reactor-hit]');
  const status = hero.querySelector('[data-reactor-status]');
  const reduce = window.matchMedia('not all').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const state = {
    hue: 205, charging: false, power: 0, pulse: 0, spin: 0, tx: 0, ty: 0, dragX: 0, dragY: 0, vx: 0, vy: 0, onTick: null,
    awake: true,
  };
  let scene = null;

  if (reduce) {
    hero.classList.add('reactor-still');
    if (status) status.textContent = 'Arc reactor core';
    return;
  }

  interact();
  if (!webgl2() || !('ResizeObserver' in window)) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'reactor__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.prepend(canvas);

  // The three.js scene waits for page load and then an idle moment, so its
  // CDN requests never compete with the first screen. The poster shows meanwhile.
  const loaded = document.readyState === 'complete' ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  const idle = loaded.then(() => new Promise((resolve) => ('requestIdleCallback' in window
    ? requestIdleCallback(resolve, { timeout: 2000 }) : setTimeout(resolve, 200))));
  idle.then(() => import('./reactor-scene.js')).then(({ createReactor }) => {
    scene = createReactor(canvas, state);
    const size = () => {
      const box = canvas.getBoundingClientRect();
      if (box.width) scene.resize(Math.round(box.width), Math.round(box.height));
    };
    size();
    new ResizeObserver(size).observe(canvas);
    scene.setHue(state.hue);
    canvas.addEventListener('webglcontextlost', () => {
      scene.stop();
      scene = null;
      root.classList.remove('is-live');
    });
    root.classList.add('is-live');
    run(scene);
  }).catch(() => canvas.remove());

  // Renders only while the reactor is on screen and the tab is visible.
  function run(live) {
    let seen = false;
    const toggle = () => (seen && !document.hidden ? live.start() : live.stop());
    new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      toggle();
    }).observe(root);
    document.addEventListener('visibilitychange', toggle);
  }

  // Input --------------------------------------------------------------
  function interact() {
    let shown = '';
    let reset = 0;
    let said = 0;
    let press = null;
    let since = 0;
    let used = false;
    const say = (text) => {
      if (!status || text === shown) return;
      shown = text;
      status.textContent = text;
    };
    const sayFor = (text, ms) => {
      say(text);
      clearTimeout(reset);
      reset = setTimeout(() => say(HINT), ms);
    };
    say(HINT);

    // The charge ring follows the power while it is held, and drains after.
    const ring = (power) => {
      root.style.setProperty('--charge', power.toFixed(3));
      root.classList.toggle('is-charging', state.charging || power > 0.01);
    };

    // A ring of light that runs out from the core and across the hero. Only
    // a pulse the visitor fires makes the name catch the light.
    const wave = (p, flash) => {
      const out = document.createElement('span');
      out.className = 'reactor__wave';
      out.setAttribute('aria-hidden', 'true');
      root.append(out);
      const reach = Math.hypot(hero.clientWidth, hero.clientHeight) / Math.max(1, hit.offsetWidth);
      const done = () => out.remove();
      if (out.animate) {
        out.animate([
          { transform: 'scale(0.55)', opacity: 0.95 },
          { transform: `scale(${(1.2 + p * reach).toFixed(2)})`, opacity: 0 },
        ], { duration: 700 + p * 800, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)' }).finished.then(done, done);
      } else {
        setTimeout(done, 700);
      }
      if (!flash) return;
      hero.classList.remove('is-pulsed');
      void hero.offsetWidth; // restart the name's flash
      hero.classList.add('is-pulsed');
    };

    // Left alone it shows what it does a couple of times, softly, then rests.
    let nudged = 0;
    const nudge = setInterval(() => {
      if (used || nudged >= NUDGES) {
        clearInterval(nudge);
        return;
      }
      if (document.hidden || state.charging || press) return;
      nudged += 1;
      state.pulse = 0.6;
      wave(0.12, false);
    }, NUDGE_MS);

    state.onTick = () => {
      if (!press) {
        // After a drag it keeps turning a moment, then eases home.
        state.dragX += state.vx;
        state.dragY += state.vy;
        state.vx *= 0.95;
        state.vy *= 0.95;
        state.dragX *= 0.992;
        state.dragY *= 0.992;
      }
      ring(state.power);
      if (state.charging) {
        const pct = Math.round(state.power * 100);
        say(pct >= 100 ? 'Full power. Let go.' : `Charging ${pct}%`);
      }
    };

    const charge = () => {
      used = true;
      since = performance.now();
      clearTimeout(reset);
      state.charging = true;
      ring(state.power);
      if (!scene) say('Charging');
    };

    const fire = () => {
      // Without the live model nothing counts the charge, so the hold's
      // length stands in for it.
      const p = scene ? state.power : Math.min(1, (performance.now() - since) / (CHARGE_S * 1000));
      state.charging = false;
      state.pulse = 0.35 + 0.65 * p;
      if (!scene) ring(0);
      wave(p, true);
      sayFor(p > 0.99 ? 'Full power pulse.' : LINES[said++ % LINES.length], 1800);
    };

    hit.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      hit.setPointerCapture?.(event.pointerId);
      press = { x: event.clientX, y: event.clientY, lx: event.clientX, ly: event.clientY, drag: false };
      charge();
    });
    hit.addEventListener('pointermove', (event) => {
      if (!press) return;
      const dx = event.clientX - press.lx;
      const dy = event.clientY - press.ly;
      press.lx = event.clientX;
      press.ly = event.clientY;
      if (!press.drag && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
        press.drag = true;
        state.charging = false;
        root.classList.add('is-dragging');
        say(HINT);
      }
      if (!press.drag) return;
      state.dragX = clamp(state.dragX + dx * 0.014, -2.1, 2.1);
      state.dragY = clamp(state.dragY + dy * 0.014, -1.2, 1.2);
      state.vx = clamp(dx * 0.0035, -0.08, 0.08);
      state.vy = clamp(dy * 0.0035, -0.08, 0.08);
      state.spin += dx * 0.006;
    });
    const release = (cancelled) => {
      if (!press) return;
      const { drag } = press;
      press = null;
      root.classList.remove('is-dragging');
      if (drag || cancelled) {
        state.charging = false;
        if (!scene) ring(0);
        say(HINT);
      } else {
        fire();
      }
    };
    hit.addEventListener('pointerup', () => release(false));
    hit.addEventListener('pointercancel', () => release(true));
    hit.addEventListener('contextmenu', (event) => event.preventDefault());

    hit.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat && !state.charging) charge();
    });
    hit.addEventListener('keyup', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (state.charging) fire();
    });
    hit.addEventListener('blur', () => {
      if (press || !state.charging) return;
      state.charging = false;
      if (!scene) ring(0);
      say(HINT);
    });

    // With a mouse, the reactor turns to face the pointer anywhere on screen.
    if (fine) {
      window.addEventListener('pointermove', (event) => {
        const box = hit.getBoundingClientRect();
        state.tx = clamp((event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2), -1, 1);
        state.ty = clamp((event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2), -1, 1);
      }, { passive: true });
    }
  }
}
