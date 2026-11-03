// The lab: one 3D room fixed behind the whole page, walked by scrolling. The
// head script decides before first paint whether this browser gets it (the
// `lab` class on <html>); everything here only runs when it did. If anything
// fails (three.js does not load, the first frame throws, the GPU drops the
// context) the lab takes itself away and the plain page is left, whole.

import { whenActive } from './gate.js';
import { railPosition } from './lab/rail.js';

const root = document.documentElement;
const ORDER = ['top', 'about', 'work', 'experience', 'toolkit', 'contact'];
const BAYS = 7;

let ready = Promise.resolve(null);

export function getLab() {
  return ready;
}

export function initLab() {
  if (!root.classList.contains('lab')) return;
  ready = boot().catch(() => null);
}

async function boot() {
  const stops = ORDER.map((id) => {
    const section = document.getElementById(id);
    return { id, section, frame: section?.querySelector(`[data-lab-frame="${id}"]`) };
  }).filter((s) => s.section);
  const row = stops.findIndex((s) => s.id === 'work');

  const canvas = document.createElement('canvas');
  canvas.className = 'lab__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  let scene = null;
  let failed = false;
  const cleanups = [];
  const fail = () => {
    if (failed) return null;
    failed = true;
    cleanups.forEach((fn) => fn());
    try { scene?.dispose(); } catch { /* already gone */ }
    canvas.remove();
    root.classList.remove('lab', 'lab-ready');
    delete root.dataset.stop;
    delete root.dataset.door;
    ready = Promise.resolve(null);
    return null;
  };
  const on = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  on(canvas, 'webglcontextlost', fail);

  let createLab;
  try {
    ({ createLab } = await import('./lab/scene.js'));
  } catch {
    return fail();
  }
  // The head script's failsafe may have given up on the lab while it loaded.
  if (failed || !root.classList.contains('lab')) return fail();

  const phone = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720;
  try {
    scene = createLab(canvas, { tier: phone ? 'phone' : 'desktop', stops: stops.map(({ id, section, frame }) => ({ id, section, frame })) });
  } catch {
    return fail();
  }

  // Each section's place in the page, in page pixels, measured again whenever
  // the layout changes.
  let places = [];
  let maxScroll = 0;
  const measure = () => {
    // Floored: a section's top is fractional, the scroll lands on whole pixels,
    // and arriving at a section must count as being there.
    places = stops.map(({ section }) => ({ top: Math.floor(section.getBoundingClientRect().top + window.scrollY), height: section.offsetHeight }));
    maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
  };
  const position = () => railPosition(window.scrollY, window.innerHeight, places, { maxScroll, row: { stop: row, count: BAYS } });

  const stopListeners = [];
  const bayListeners = [];
  let stop = -1;
  let bay = -1;
  const update = (instant = false) => {
    if (failed) return;
    const rail = position();
    scene.setRail(rail, { instant });
    if (rail.stop !== stop) {
      stop = rail.stop;
      root.dataset.stop = stops[stop].id;
      stopListeners.forEach((fn) => fn(stops[stop].id));
    }
    const nextBay = rail.bay >= 0 ? Math.round(rail.bay) : -1;
    if (nextBay !== bay) {
      bay = nextBay;
      if (bay >= 0) bayListeners.forEach((fn) => fn(bay));
    }
  };

  let queued = 0;
  const schedule = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      update();
    });
  };
  cleanups.push(() => cancelAnimationFrame(queued));

  const fit = () => scene.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

  // The first frame. If it throws, the visitor never sees a broken room.
  try {
    measure();
    fit();
    update(true);
  } catch {
    return fail();
  }
  if (failed || !root.classList.contains('lab')) return fail();
  root.dataset.door = scene.room.door.isOpen ? 'open' : 'closed';
  root.classList.add('lab-ready');

  on(window, 'scroll', schedule, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      measure();
      scene.measure();
      schedule();
    });
    observer.observe(document.querySelector('main') ?? document.body);
    cleanups.push(() => observer.disconnect());
  }
  // A new window size keeps the visitor at the section they were reading.
  on(window, 'resize', () => {
    const held = stop;
    measure();
    fit();
    if (held >= 0 && position().stop !== held) window.scrollTo({ top: places[held].top, behavior: 'instant' });
    update(true);
  });

  let active = false;
  const sync = () => {
    if (failed) return;
    if (active && !document.hidden) scene.start();
    else scene.stop();
  };
  whenActive(() => {
    active = true;
    sync();
  });
  on(document, 'visibilitychange', sync);

  const scrollTo = (top, instant) => window.scrollTo({ top, behavior: instant ? 'instant' : 'smooth' });
  return {
    scene,
    goToStop(id, { instant = false } = {}) {
      const k = stops.findIndex((s) => s.id === id);
      if (k >= 0) scrollTo(places[k].top, instant);
    },
    goToBay(index, { instant = false } = {}) {
      if (row < 0) return;
      const { top, height } = places[row];
      const end = Math.max(top, Math.min(top + height - window.innerHeight, places[row + 1]?.top ?? Infinity));
      const i = Math.min(Math.max(Math.round(index), 0), BAYS - 1);
      scrollTo(top + ((end - top) * i) / (BAYS - 1), instant);
    },
    onStop(fn) {
      stopListeners.push(fn);
    },
    onBay(fn) {
      bayListeners.push(fn);
    },
  };
}
