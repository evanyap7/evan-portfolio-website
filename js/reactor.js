// The hero's arc reactor, page side. The 3D model (reactor-scene.js, with
// three.js from the CDN in the import map) loads after the page, over a
// still of itself, and only where WebGL2 works; otherwise the still stays.
// Hold the reactor (pointer, or Space/Enter on its button) to charge it,
// and let go to fire a pulse; drag it to spin it; with a mouse it also
// turns to face the pointer. With reduced motion the reactor is a fully
// powered still. On wide screens the hero's credentials hang off the reactor
// as callouts on leader lines; narrower, they stay a plain list.

import { whenActive } from './gate.js';

const LINES = ['Pulse away.', 'Repulsor fired.', 'Systems nominal.', 'Again?', 'Nice one.'];
const WIDE = 1024;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const bodyColour = () => window.getComputedStyle(document.body).backgroundColor;

function webgl2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

// Places each credential at the end of a leader line from the reactor's rim.
function initCallouts(hero, core) {
  const list = hero.querySelector('[data-callouts]');
  const lines = hero.querySelector('[data-lines]');
  if (!list || !lines) return;
  const items = [...list.children];

  const layout = () => {
    const wide = window.innerWidth >= WIDE;
    hero.classList.toggle('hero--hud', wide);
    if (!wide) {
      lines.replaceChildren();
      items.forEach((item) => item.removeAttribute('style'));
      return;
    }
    const box = hero.getBoundingClientRect();
    const rim = core.getBoundingClientRect();
    const r = rim.width / 2;
    const cx = rim.left - box.left + r;
    const cy = rim.top - box.top + r;
    lines.setAttribute('viewBox', `0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}`);
    let marks = '';
    items.forEach((item, i) => {
      const a = (Number(item.dataset.angle) * Math.PI) / 180;
      const sx = Math.sign(Math.cos(a));
      const sy = Math.sign(Math.sin(a));
      const px = cx + r * 0.97 * Math.cos(a);
      const py = cy + r * 0.97 * Math.sin(a);
      const ex = px + sx * r * 0.3;
      const ey = py + sy * r * 0.3;
      const end = ex + sx * 36;
      const left = sx < 0;
      item.classList.toggle('is-left', left);
      item.style.top = `${(ey - item.offsetHeight / 2).toFixed(1)}px`;
      item.style.left = left ? '' : `${(end + 10).toFixed(1)}px`;
      item.style.right = left ? `${(box.width - end + 10).toFixed(1)}px` : '';
      marks += `<path pathLength="1" style="--i:${i}" d="M${px.toFixed(1)} ${py.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}H${end.toFixed(1)}"/>`
        + `<rect style="--i:${i}" x="${(px - 2.5).toFixed(1)}" y="${(py - 2.5).toFixed(1)}" width="5" height="5"/>`;
    });
    lines.innerHTML = marks;
  };

  layout();
  document.fonts?.ready.then(layout);
  new ResizeObserver(layout).observe(hero);
  // The lines draw in once the site is awake; a later relayout (a resize,
  // a phone's address bar) redraws them in place without replaying that.
  whenActive(() => setTimeout(() => lines.classList.add('is-drawn'), 2400));
}

export function initReactor() {
  const root = document.querySelector('[data-reactor]');
  if (!root) return;
  const hero = root.closest('.hero');
  const hit = root.querySelector('[data-reactor-hit]');
  const status = hero.querySelector('[data-reactor-status]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const state = {
    hue: 205, charging: false, power: 0, pulse: 0, spin: 0, tx: 0, ty: 0, dragX: 0, dragY: 0, vx: 0, vy: 0, onTick: null,
    // Behind the gate (gate.js) it sleeps, dark, until the visitor wakes it.
    awake: !document.documentElement.classList.contains('gated'),
  };
  let scene = null;
  document.addEventListener('portfolio:waking', () => {
    state.awake = true;
    state.pulse = 1;
    if (reduce) scene?.poweredOn();
  }, { once: true });

  if ('ResizeObserver' in window) initCallouts(hero, hit);

  if (reduce) {
    hero.classList.add('reactor-still');
    status.textContent = 'Iron Man’s arc reactor';
  }
  if (!webgl2() || !('ResizeObserver' in window)) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'reactor__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.prepend(canvas);

  import('./reactor-scene.js').then(({ createReactor }) => {
    scene = createReactor(canvas, state);
    const size = () => {
      const box = canvas.getBoundingClientRect();
      if (box.width) scene.resize(Math.round(box.width), Math.round(box.height));
    };
    size();
    new ResizeObserver(size).observe(canvas);
    scene.setBackground(bodyColour());
    scene.setHue(state.hue);
    canvas.addEventListener('webglcontextlost', () => {
      scene.stop();
      root.classList.remove('is-live');
    });
    root.classList.add('is-live');
    if (reduce) {
      scene.poweredOn();
      return;
    }
    run(scene);
  }).catch(() => canvas.remove());

  // Renders only while the hero is on screen and the tab is visible.
  function run(live) {
    let seen = false;
    const toggle = () => (seen && !document.hidden ? live.start() : live.stop());
    new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      toggle();
    }).observe(root);
    document.addEventListener('visibilitychange', toggle);
    interact();
  }

  // Input --------------------------------------------------------------
  function interact() {
    const idle = fine ? 'Iron Man’s arc reactor · hold to charge, drag to spin' : 'Iron Man’s arc reactor · press and hold';
    let shown = '';
    let reset = 0;
    let said = 0;
    let press = null;
    const say = (text) => {
      if (text === shown) return;
      shown = text;
      status.textContent = text;
    };
    const sayFor = (text, ms) => {
      say(text);
      clearTimeout(reset);
      reset = setTimeout(() => say(idle), ms);
    };
    say(idle);
    // Woken from the gate: a full pulse and a greeting.
    document.addEventListener('portfolio:waking', () => {
      quiet = -2;
      window.setTimeout(() => {
        wave(1);
        sayFor('Systems online.', 2600);
      }, 900);
    }, { once: true });

    // Left alone it still gives itself a small pulse now and then, so the
    // first-time visitor sees what it does without having to try.
    let quiet = 0;
    const nudge = () => {
      if (!state.awake || document.hidden || state.charging || press || state.power > 0) return;
      state.pulse = 0.9;
      wave(0.6);
    };
    setInterval(() => {
      quiet += 1;
      if (quiet >= 2) {
        quiet = 0;
        nudge();
      }
    }, 3000);

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
      if (state.charging) {
        const pct = Math.round(state.power * 100);
        say(pct >= 100 ? 'Full power. Let go.' : `Charging ${pct}%`);
      }
    };

    const charge = () => {
      quiet = -4;
      clearTimeout(reset);
      state.charging = true;
    };

    // A ring of light that runs out from the core and across the hero.
    const wave = (p) => {
      const ring = document.createElement('span');
      ring.className = 'reactor__wave';
      ring.setAttribute('aria-hidden', 'true');
      root.append(ring);
      const reach = Math.hypot(hero.clientWidth, hero.clientHeight) / hit.offsetWidth;
      ring.animate([
        { transform: 'scale(0.55)', opacity: 0.95 },
        { transform: `scale(${(1.2 + p * reach).toFixed(2)})`, opacity: 0 },
      ], { duration: 700 + p * 800, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)' }).finished.finally(() => ring.remove());
      hero.classList.remove('is-pulsed');
      void hero.offsetWidth; // restart the name's flash
      hero.classList.add('is-pulsed');
    };

    const fire = () => {
      const p = state.power;
      state.charging = false;
      state.pulse = 0.35 + 0.65 * p;
      wave(p);
      sayFor(p > 0.99 ? 'Full power pulse.' : LINES[said++ % LINES.length], 1800);
    };

    hit.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      hit.setPointerCapture(event.pointerId);
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
        say(idle);
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
        say(idle);
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
      if (!event.repeat) charge();
    });
    hit.addEventListener('keyup', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (state.charging) fire();
    });
    hit.addEventListener('blur', () => {
      if (!press) state.charging = false;
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
