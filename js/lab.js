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
  let stop = -1;
  let bay = -1;
  const cleanups = [];
  // The plain page is far shorter than the lab's, so the visitor is put back
  // at the section they were in, after the Hall has given Work its cards back
  // (js/hall.js listens for lab:failed).
  const fail = () => {
    if (failed) return null;
    failed = true;
    const reading = stops[stop]?.section;
    cleanups.forEach((fn) => fn());
    try { scene?.dispose(); } catch { /* already gone */ }
    canvas.remove();
    root.classList.remove('lab', 'lab-ready', 'door-open', 'shelf-pinned');
    delete root.dataset.stop;
    delete root.dataset.door;
    delete root.dataset.bay;
    ready = Promise.resolve(null);
    document.dispatchEvent(new Event('lab:failed'));
    reading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    return null;
  };
  const on = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  on(canvas, 'webglcontextlost', fail);

  let createLab;
  let buildStops;
  let createSpots;
  try {
    [{ createLab }, { buildStops }, { createSpots }] = await Promise.all([
      import('./lab/scene.js'),
      import('./lab/stops.js'),
      import('./lab/spots.js'),
    ]);
  } catch {
    return fail();
  }
  // The head script's failsafe may have given up on the lab while it loaded.
  if (failed || !root.classList.contains('lab')) return fail();

  const phone = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720;
  let anchors = {};
  try {
    scene = createLab(canvas, { tier: phone ? 'phone' : 'desktop', stops: stops.map(({ id, section, frame }) => ({ id, section, frame })) });
    // The rooms' set pieces: built before the first frame, so their materials
    // and light compile with the rest; a piece that fails to load (the
    // portrait) leaves the room without it, not the lab.
    const built = buildStops(scene);
    anchors = built.anchors;
    built.loaded.catch(() => {});
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
    // A section with a hold in it (the row of suits) starts where the hold's
    // panel pins and ends with the hold: the camera reaches the first bay as
    // the panel settles, and walks the bays while it stays pinned.
    places = stops.map(({ section }) => {
      const hold = section.querySelector('[data-lab-hold]');
      if (!hold) return { top: Math.floor(section.getBoundingClientRect().top + window.scrollY), height: section.offsetHeight };
      const box = hold.getBoundingClientRect();
      const pin = hold.firstElementChild;
      const pinned = (pin && parseFloat(getComputedStyle(pin).top)) || 0;
      const top = Math.floor(box.top + window.scrollY - pinned);
      return { top, height: Math.round(box.bottom + window.scrollY) - top };
    });
    maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
  };
  const position = () => railPosition(window.scrollY, window.innerHeight, places, { maxScroll, row: { stop: row, count: BAYS } });

  // The door: shut while the site is gated, and the camera waits outside it
  // until it has opened and the reactor in it has faded (css/lab.css).
  const door = scene.room.door;
  let held = true;

  const stopListeners = [];
  const bayListeners = [];
  // On a narrow screen the shelf stays pinned as a strip at the top while the
  // Experience list scrolls under it (css/lab.css). A phone has no hover, so
  // the entry being read lights its object on the shelf instead.
  const shelf = stops.findIndex((s) => s.id === 'experience');
  const reading = [];
  let pinned = false;
  const spy = () => {
    const narrow = window.matchMedia('(max-width: 1023px)').matches;
    const frame = stops[shelf]?.frame;
    const line = (frame ? frame.offsetTop + frame.offsetHeight : 0) + 48;
    let at = null;
    if (pinned && narrow) reading.forEach(({ item }) => { if (item.getBoundingClientRect().top <= line) at = item; });
    reading.forEach(({ item, button }) => {
      item.classList.toggle('is-read', item === at);
      button.classList.toggle('is-read', item === at);
    });
  };
  const update = (instant = false) => {
    if (failed) return;
    const rail = position();
    scene.setRail(held ? { ...rail, u: 0 } : rail, { instant });
    if (rail.stop !== stop) {
      stop = rail.stop;
      root.dataset.stop = stops[stop].id;
      stopListeners.forEach((fn) => fn(stops[stop].id));
    }
    // Pinned for as long as the camera holds in Experience.
    const pin = shelf >= 0 && window.scrollY >= places[shelf].top - 1 && window.scrollY <= places[shelf].top + places[shelf].height - window.innerHeight + 1;
    const was = pinned;
    pinned = pin;
    if (pin !== was) root.classList.toggle('shelf-pinned', pin);
    if (pin || was) spy();
    const nextBay = rail.bay >= 0 ? Math.round(rail.bay) : -1;
    if (nextBay !== bay) {
      bay = nextBay;
      if (bay >= 0) root.dataset.bay = String(bay);
      else delete root.dataset.bay;
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

  // A visitor already let in (a link into the page, or earlier this session)
  // finds the door open from the first frame.
  if (!root.classList.contains('gated')) {
    door.open({ instant: true });
    held = false;
  }

  // The first frame. If it throws, the visitor never sees a broken room.
  try {
    measure();
    fit();
    update(true);
  } catch {
    return fail();
  }
  if (failed || !root.classList.contains('lab')) return fail();
  root.dataset.door = door.isOpen ? 'open' : 'closed';
  root.classList.toggle('door-open', door.isOpen);
  root.classList.add('lab-ready');
  if (door.isOpen) document.dispatchEvent(new Event('lab:door-open'));

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
  // A new window size keeps the visitor at the section they were reading. A
  // phone's address bar showing or hiding only changes the height a little:
  // the page stays where the thumb left it, and the camera eases to match.
  let size = [window.innerWidth, window.innerHeight];
  on(window, 'resize', () => {
    const bar = window.innerWidth === size[0] && Math.abs(window.innerHeight - size[1]) <= 150;
    size = [window.innerWidth, window.innerHeight];
    const held = stop;
    measure();
    fit();
    if (bar) {
      update();
      return;
    }
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

  // Waking opens the door: the room starts drawing for it, and once the
  // blades are home the reactor fades (400 ms), then the camera is free.
  const open = () => {
    if (failed || door.isOpen) return;
    active = true;
    sync();
    scene.wake();
    // The reactor's pulse at 100% floods the room with its light.
    scene.pulse();
    door.open().then(() => {
      if (failed) return;
      root.dataset.door = 'open';
      root.classList.add('door-open');
      window.setTimeout(() => {
        held = false;
        update();
        document.dispatchEvent(new Event('lab:door-open'));
      }, 400);
    });
  };
  if (!door.isOpen) {
    if (root.classList.contains('waking')) open();
    else on(document, 'portfolio:waking', open, { once: true });
  }

  const scrollTo = (top, instant) => window.scrollTo({ top, behavior: instant ? 'instant' : 'smooth' });
  const api = {
    scene,
    goToStop(id, { instant = false } = {}) {
      const k = stops.findIndex((s) => s.id === id);
      if (k >= 0) scrollTo(places[k].top, instant);
    },
    goToBay(index, { instant = false } = {}) {
      if (row < 0) return;
      if (instant) measure();
      const { top, height } = places[row];
      const end = Math.max(top, Math.min(top + height - window.innerHeight, places[row + 1]?.top ?? Infinity));
      const i = Math.min(Math.max(Math.round(index), 0), BAYS - 1);
      scrollTo(top + ((end - top) * i) / (BAYS - 1), instant);
      // A jump (a link to a suit) puts the camera there too, rather than
      // flying it the length of the room past every other suit.
      if (instant) update(true);
    },
    onStop(fn) {
      stopListeners.push(fn);
    },
    onBay(fn) {
      bayListeners.push(fn);
    },
  };

  // The things in the rooms you can click, one per item in the page's own
  // list (the list stays the words; the spot only points at its object).
  const spots = createSpots(api);
  document.querySelectorAll('[data-things] > li[data-thing]').forEach((item) => {
    const anchor = anchors[item.dataset.thing];
    const heading = item.querySelector('h4');
    const words = item.querySelector('p');
    if (!anchor || !heading || !words) return;
    const title = heading.textContent.trim();
    spots.add({ id: item.dataset.thing, label: title, stop: item.closest('section')?.id ?? 'about', anchor, title, body: words });
  });

  // The shelf's things, one per role and per row of the honours list: a
  // role's card is its title and its first point; a row's is its own words.
  const plain = (node) => (node?.getAttribute?.('alt') || node?.textContent || '').replace(/\s+/g, ' ').trim();
  const para = (text) => Object.assign(document.createElement('p'), { textContent: text });
  document.querySelectorAll('#experience [data-item]').forEach((item) => {
    const anchor = anchors[item.dataset.item];
    if (!anchor) return;
    let title;
    let body;
    if (item.classList.contains('role')) {
      const org = item.querySelector('.role__org');
      title = plain(org?.querySelector('img') ?? org);
      body = document.createElement('div');
      const point = item.querySelector('.role__points li') ?? item.querySelector('.role__points');
      body.append(para(plain(item.querySelector('.role__title'))), para(plain(point)));
    } else {
      const dt = item.querySelector('dt');
      const dd = item.querySelector('dd');
      if (!dt || !dd) return;
      title = plain(dt);
      body = document.createElement('p');
      dd.childNodes.forEach((node) => body.append(node.cloneNode(true)));
    }
    if (!title) return;
    const button = spots.add({ id: item.dataset.item, label: title, stop: 'experience', anchor, title, body });
    // The row on the page and its object on the shelf select each other: the
    // mouse or the keyboard on either one lights both.
    reading.push({ item, button });
    const link = (on) => {
      item.classList.toggle('is-linked', on);
      button.classList.toggle('is-linked', on);
    };
    const mouse = (on) => (event) => { if (event.pointerType === 'mouse') link(on); };
    [item, button].forEach((end) => {
      end.addEventListener('pointerenter', mouse(true));
      end.addEventListener('pointerleave', mouse(false));
      end.addEventListener('focusin', () => link(true));
      end.addEventListener('focusout', () => link(false));
    });
  });
  // The bench's instruments, one per row of the toolkit, in its order: each
  // opens its row's tools, icons and all, on a hologram card.
  document.querySelectorAll('#kit-tools dl > div').forEach((row, i) => {
    const anchor = anchors[`toolkit:${i}`];
    const list = row.querySelector('ul.tools');
    const title = plain(row.querySelector('dt'));
    if (anchor && list && title) spots.add({ id: `tool-${i}`, label: title, stop: 'toolkit', anchor, title, body: list, variant: 'holo' });
  });
  cleanups.push(() => {
    spots.close();
    document.querySelectorAll('.lab-spot, .lab-suit, dialog.lab-card').forEach((node) => node.remove());
  });

  return api;
}
