// The page's live layer, on top of the scene (lab.js) and the small motions
// (motion.js): a pulse where it clicks, buttons that lean in to it, the
// portrait that tilts under it, labels that decode when they arrive, and
// floating readouts round the portrait.
//
// Everything here is decoration and aria-hidden, or changes only text that
// ends up exactly as it was written. The pointer parts run only with a mouse
// or trackpad; none of it runs under reduced motion or without the lab.

import { whenActive } from './gate.js';

const root = document.documentElement;
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
const GLYPHS = '01<>/\\_[]{}#$%&*+=';

function make(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  node.setAttribute('aria-hidden', 'true');
  return node;
}

// A label's letters resolve left to right out of noise, then it is exactly as
// written. Only text nodes change, so the markup inside stays where it was.
function decode(node, ms = 650) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) {
    const text = walker.currentNode;
    if (text.nodeValue.trim()) parts.push([text, text.nodeValue]);
  }
  const total = parts.reduce((sum, [, original]) => sum + original.length, 0);
  const start = performance.now();
  const tick = (now) => {
    const done = Math.min(1, (now - start) / ms);
    let seen = 0;
    parts.forEach(([text, original]) => {
      text.nodeValue = [...original]
        .map((letter, i) => ((seen + i) / total < done || /\s/.test(letter)
          ? letter
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');
      seen += original.length;
    });
    if (done < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initDecode() {
  const labels = document.querySelectorAll('.sec-label');
  if (!labels.length) return;
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      seen.unobserve(entry.target);
      decode(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  labels.forEach((label) => seen.observe(label));
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

// Tilts toward the pointer in 3D, with a highlight that slides across it.
function tilt(el) {
  el.classList.add('tilt');
  el.dataset.tilt = '';
  el.addEventListener('pointermove', (event) => {
    const box = el.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    el.style.setProperty('--rx', `${(-py * 12).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(px * 14).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
    el.classList.add('is-tilting');
  }, { passive: true });
  el.addEventListener('pointerleave', () => {
    el.classList.remove('is-tilting');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  });
}

// Readouts that float round the portrait: facts already on the page.
function initChips() {
  const photo = document.querySelector('.about__photo');
  if (!photo) return;
  [
    ['SUTD · TEP scholar', 'a'],
    ['460+ tests', 'b'],
    ['Top 5 of 100', 'c'],
  ].forEach(([text, place]) => {
    const chip = make('span', `about__chip about__chip--${place}`);
    chip.textContent = text;
    photo.append(chip);
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
  initDecode();
  initChips();
  initLiquid();
  if (!FINE.matches) return;
  // Held until the site is awake, so the gate stays the only thing on screen.
  whenActive(() => {
    initPulse();
    initMagnets();
    document.querySelectorAll('.about__photo').forEach(tilt);
  });
}
