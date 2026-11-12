// The scene: a photograph of the workshop fixed behind the hero, which
// pushes in slowly as the hero passes. It is a short loop of the room
// breathing (haze drifting, lights flickering), held still until the site
// wakes, paused while a sheet covers the hero (deck.js sends `deck:cover`),
// and paused for good by the hero's "Pause background" button.
//
// Where the browser has WebGL the shot is drawn in depth (scene-gl.js): the
// camera leans with the pointer and pushes in past near things faster than
// far ones; the reactor is the dark room's only light until the site wakes.
// The layer built here is then the fallback, and it still carries what lies
// over the picture: the film grain and the hero's dark pool.
//
// The head script decides before first paint whether this browser gets the
// scene (the `lab` class on <html>); without it the page is the plain page.
// Other modules read what this one sets: the reactor (reactor.js,
// css/reactor.css) steps aside on `door-open`, and `depth` is on <html>
// while the canvas is the picture.

import { whenActive } from './gate.js';
import { createDepthScene, ZOOM } from './scene-gl.js';

const root = document.documentElement;

// The hero's shot. `x` is where a narrow screen's crop is centred: the still
// keeps its subject right of centre, clear of the words on a wide screen, so
// a phone leans that way to keep it in frame. The other sections are sheets
// (css/editions.css) and have no shot of their own.
const SHOTS = [
  { id: 'top', name: 'hero', x: '68%', video: true },
];
const DIR = 'img/scene/';
// How far a shot has pushed in by the time its section leaves the screen.
const PUSH = 0.14;
// After the reactor's pulse, the room comes up and the reactor steps aside.
const WAKE_MS = 700;
const FADE_MS = 400;

export function initLab() {
  if (!root.classList.contains('lab')) return;
  const still = window.matchMedia('not all').matches;

  const stops = SHOTS.map((shot) => ({ ...shot, section: document.getElementById(shot.id) })).filter((s) => s.section);
  if (!stops.length) return;

  const scene = document.createElement('div');
  scene.className = 'scene';
  scene.setAttribute('aria-hidden', 'true');

  const videos = new Map();
  stops.forEach((stop, i) => {
    const layer = document.createElement('div');
    layer.className = 'scene__shot';
    layer.dataset.shot = stop.id;
    layer.style.setProperty('--x', stop.x);
    // The picture at its own shape, cropped by the screen.
    const frame = document.createElement('div');
    frame.className = 'scene__frame';
    const img = document.createElement('img');
    img.className = 'scene__media';
    img.alt = '';
    img.decoding = 'async';
    // The frame covers the screen at 16:9, so on a tall phone it is far wider
    // than the screen: ask for the width it is drawn at, not the screen's.
    img.sizes = `${Math.ceil(Math.max(window.innerWidth, (window.innerHeight * 16) / 9))}px`;
    // The first shot is the one on screen at load; the rest wait their turn.
    img.fetchPriority = i === 0 ? 'high' : 'low';
    stop.img = img;
    frame.append(img);
    if (stop.video && !still) {
      const video = document.createElement('video');
      video.className = 'scene__media scene__video';
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      // Only the shot in view loads and plays; the hero's is wanted at once.
      video.preload = i === 0 ? 'auto' : 'none';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([ext, type]) => {
        const source = document.createElement('source');
        source.src = `${DIR}${stop.name}.${ext}`;
        source.type = type;
        video.append(source);
      });
      // The clip shows only once it is moving; until then, or if it cannot
      // play, its still (the same frame) is the shot.
      video.addEventListener('playing', () => layer.classList.add('is-moving'), { once: true });
      frame.append(video);
      videos.set(i, video);
      stop.clip = video;
    }
    layer.append(frame);
    stop.layer = layer;
    scene.append(layer);
  });
  const grain = document.createElement('div');
  grain.className = 'scene__grain';
  scene.append(grain);
  document.body.prepend(scene);

  // The shots in depth. While that canvas is the picture the layers' own
  // pictures are hidden, and are not fetched: a layer's still is asked for
  // only when it has to be the picture itself.
  let current = -1;
  const paint = (i) => {
    const { img, name } = stops[i] ?? {};
    if (!img || img.src) return;
    img.srcset = `${DIR}${name}-1200.webp 1200w, ${DIR}${name}-2400.webp 2400w, ${DIR}${name}.webp 3840w`;
    img.src = `${DIR}${name}-2400.webp`;
  };
  let drawn = false;
  const gl = still ? null : createDepthScene(scene, stops.map(({ name, x, clip }) => ({ name, x, video: clip })), {
    dir: DIR,
    onActive(on) {
      drawn = on;
      scene.classList.toggle('is-gl', on);
      root.classList.toggle('depth', on);
      if (!on) paint(current);
    },
  });
  if (gl) scene.style.setProperty('--zoom', ZOOM);
  else stops.forEach((stop, i) => paint(i));

  // The shot leans away from the pointer, eased (the canvas has its own).
  if (!still && !gl && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let lean = 0;
    const ease = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      scene.style.setProperty('--px', x.toFixed(4));
      scene.style.setProperty('--py', y.toFixed(4));
      lean = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(ease) : 0;
    };
    window.addEventListener('pointermove', (event) => {
      tx = (event.clientX / window.innerWidth) * 2 - 1;
      ty = (event.clientY / window.innerHeight) * 2 - 1;
      if (!lean) lean = requestAnimationFrame(ease);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      if (!lean) lean = requestAnimationFrame(ease);
    });
  }

  // Each section's place in the page, measured again whenever the layout
  // changes. The hero is first and may be pinned (sticky), where its box
  // says where it is stuck, not where it starts: it starts at the top.
  let places = [];
  const measure = () => {
    places = stops.map(({ section }, i) => {
      const box = section.getBoundingClientRect();
      return { top: i === 0 ? 0 : box.top + window.scrollY, height: box.height };
    });
  };

  let awake = false;
  let covered = false;
  let held = false;
  // A loop runs only once the site is awake, while its shot is up, the hero
  // is not under a sheet, the tab is in view and the visitor has not paused it.
  const play = () => {
    videos.forEach((video, i) => {
      if (awake && !document.hidden && !covered && !held && i === current) video.play().catch(() => {});
      else video.pause();
    });
    gl?.invalidate();
  };
  videos.forEach((video) => video.addEventListener('playing', () => gl?.invalidate()));
  document.addEventListener('deck:cover', (event) => {
    covered = Boolean(event.detail);
    play();
  });

  // The hero's own control for the loop: anything that moves on its own for
  // more than five seconds can be paused.
  const pause = document.querySelector('[data-scene-pause]');
  if (pause && videos.size) {
    pause.hidden = false;
    pause.addEventListener('click', () => {
      held = !held;
      pause.textContent = held ? 'Play background' : 'Pause background';
      pause.setAttribute('aria-pressed', String(held));
      play();
    });
  }

  const update = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    // The stop is the last section whose top has reached the middle of the
    // screen: a link to a section lands on its top, and is there.
    let at = 0;
    places.forEach((place, i) => {
      if (place.top <= y + vh * 0.5) at = i;
    });
    // Behind the gate a phone's sections are out of the flow (reactor.css),
    // so their places say nothing: the hero's shot is the one up.
    const gated = root.classList.contains('gated');
    if (gated) at = 0;
    if (at !== current) {
      stops[current]?.layer.classList.remove('is-on');
      stops[at].layer.classList.add('is-on');
      current = at;
      root.dataset.stop = stops[at].id;
      if (!drawn) paint(at);
      play();
    }
    if (still) return;
    // How far each section has travelled through the screen: 0 as its top
    // comes in at the foot, 1 as its foot leaves at the top. The hero starts
    // on screen, so it starts at 0 at the top of the page.
    const pushes = stops.map((stop, i) => {
      const { top, height } = places[i];
      const from = i === 0 ? top : top - vh;
      const span = i === 0 ? height : height + vh;
      const p = Math.min(1, Math.max(0, (y - from) / Math.max(1, span)));
      stop.layer.style.setProperty('--push', (1 + PUSH * p).toFixed(4));
      return PUSH * p;
    });
    if (!gl) return;
    // The camera's place along the row of shots: it leaves for the next one
    // as that section's top comes up the screen, and is there by the time
    // the top is a quarter of the way down.
    let f = 0;
    if (!gated) {
      places.forEach((place, i) => {
        if (i) f += Math.min(1, Math.max(0, (y + vh * 0.85 - place.top) / (vh * 0.6)));
      });
    }
    gl.set(f, pushes);
  };

  let queued = 0;
  const schedule = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      update();
    });
  };
  const remeasure = () => {
    measure();
    schedule();
  };

  measure();
  update();
  root.classList.add('lab-ready');

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.querySelector('main') ?? document.body);
  document.addEventListener('visibilitychange', play);
  whenActive(() => {
    awake = true;
    remeasure();
    play();
  });

  // The door: a first visit finds the room dark behind the reactor. Waking
  // brings it up; the reactor goes once the pulse has filled the screen.
  const open = (delay) => {
    window.setTimeout(() => {
      root.classList.add('door-open');
      window.setTimeout(() => document.dispatchEvent(new Event('lab:door-open')), FADE_MS);
    }, delay);
  };
  if (!root.classList.contains('gated')) open(0);
  else {
    // `entered` stays: what arrives after the door (the grid, the readouts)
    // waits a little longer on the visit that came in through it.
    const enter = () => {
      root.classList.add('entered');
      gl?.wake();
      open(still ? 0 : WAKE_MS);
    };
    if (root.classList.contains('waking')) enter();
    else document.addEventListener('portfolio:waking', enter, { once: true });
  }
}
