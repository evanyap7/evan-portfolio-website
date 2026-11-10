// The page's live layer, on top of the scene (lab.js) and the small motions
// (motion.js): a pulse where it clicks, buttons that lean in to it, and the
// headline that arrives as liquid.
//
// Everything here is decoration and aria-hidden, or changes only text that
// ends up exactly as it was written. The pointer parts run only with a mouse
// or trackpad; none of it runs under reduced motion or without the lab.

import { whenActive } from './gate.js';

const root = document.documentElement;
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');

function make(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  node.setAttribute('aria-hidden', 'true');
  return node;
}

// A click sends a ring out from where it landed, as the reactor's pulse does.
function initPulse() {
  window.addEventListener('pointerdown', (event) => {
    if (event.button) return;
    const pulse = make('span', 'fx-pulse');
    pulse.style.left = `${event.clientX}px`;
    pulse.style.top = `${event.clientY}px`;
    pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
    document.body.append(pulse);
  }, { passive: true });
}

// Buttons lean toward the pointer and settle when it leaves.
function initMagnets() {
  document.querySelectorAll('.hero__actions .pill, .nav .pill--solid').forEach((pill) => {
    const MAX = 10;
    pill.addEventListener('pointermove', (event) => {
      const box = pill.getBoundingClientRect();
      const dx = ((event.clientX - (box.left + box.width / 2)) / (box.width / 2)) * MAX;
      const dy = ((event.clientY - (box.top + box.height / 2)) / (box.height / 2)) * MAX;
      pill.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    }, { passive: true });
    pill.addEventListener('pointerleave', () => { pill.style.translate = ''; });
  });
}

// The hero headline arrives as liquid: an SVG turbulence map displaces the
// text, and the displacement drains to nothing, leaving sharp, selectable
// text. Behind the gate the headline is already up and sharp, so the
// reactor's pulse only ripples through it as it passes. The filter is
// removed at the end so the resting headline is exactly what it was. Touch
// screens get it too (it is not a pointer effect); only browsers that
// cannot filter HTML with SVG skip it.
function initLiquid() {
  const title = document.querySelector('.hero__title');
  if (!title || !window.CSS?.supports('filter', 'url(#a)')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'fx-liquid');
  svg.innerHTML = `<filter id="fx-liquid" x="-8%" y="-20%" width="116%" height="140%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="7" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
  document.body.append(svg);
  const turbulence = svg.querySelector('feTurbulence');
  const displace = svg.querySelector('feDisplacementMap');

  const ripple = root.classList.contains('gated');
  whenActive(() => {
    const MS = ripple ? 1400 : 2200;
    const FROM = ripple ? 28 : 90;
    const start = performance.now();
    title.style.filter = 'url(#fx-liquid)';
    const tick = (now) => {
      const t = Math.min(1, (now - start) / MS);
      const left = (1 - t) ** 3;
      displace.setAttribute('scale', (FROM * left).toFixed(2));
      // The ripples run vertically too, slowing as the text settles.
      turbulence.setAttribute('baseFrequency', `${(0.012 + 0.01 * left).toFixed(4)} ${(0.05 + 0.03 * left).toFixed(4)}`);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        title.style.filter = '';
        svg.remove();
      }
    };
    requestAnimationFrame(tick);
  });
}

export function initFx() {
  if (!root.classList.contains('lab') || REDUCE.matches) return;
  initLiquid();
  if (!FINE.matches) return;
  // Held until the site is awake, so the gate stays the only thing on screen.
  whenActive(() => {
    initPulse();
    initMagnets();
  });
}
