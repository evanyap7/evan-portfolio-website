// Plays the looping diagrams inside the project cards. Each one is inline
// SVG in index.html, drawn in its finished state; this animates it from
// empty and loops it. Loaded on demand by main.js.

import { SCENES } from './scenes.js';

const LOOP_MS = 9000;
const EASE = {
  out: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  inOut: 'cubic-bezier(0.6, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.3, 1.5, 0.5, 1)',
  fall: 'cubic-bezier(0.5, 0, 0.9, 0.5)',
};

export function startReels(reels) {
  reels.forEach(mount);
}

// A reel only runs while its card is open, it is on screen and the visitor
// has not paused it.
function mount(reel) {
  const scene = SCENES[reel.dataset.reel];
  if (!scene) return;

  const card = reel.closest('details');
  const toggle = reel.querySelector('[data-reel-toggle]');
  const clock = reel.querySelector('[data-reel-clock]');
  let timeline = null;
  let inView = false;
  let paused = false;
  let frame = 0;

  const tick = () => {
    const now = timeline.now();
    timeline.update(now);
    const time = `00:0${(now / 1000).toFixed(1)}`;
    if (clock.textContent !== time) clock.textContent = time;
    frame = requestAnimationFrame(tick);
  };

  const sync = () => {
    const playing = card.open && inView && !paused;
    if (playing && !timeline) {
      timeline = createTimeline(reel, scene);
      reel.classList.add('is-live');
    }
    if (!timeline) return;

    cancelAnimationFrame(frame);
    timeline.animations.forEach((animation) => (playing ? animation.play() : animation.pause()));
    if (playing) tick();
  };

  const setPaused = (value) => {
    paused = value;
    toggle.setAttribute('aria-pressed', String(paused));
  };

  toggle.hidden = false;
  clock.hidden = false;
  toggle.addEventListener('click', () => {
    setPaused(!paused);
    sync();
  });

  // Reopening a card starts its diagram again from the top.
  card.addEventListener('toggle', () => {
    if (card.open) {
      setPaused(false);
      timeline?.restart();
    }
    sync();
  });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }, { threshold: 0.2 }).observe(reel);
}

// One looping timeline per reel. Every track runs for the whole loop, so
// pausing or rewinding them together keeps the scene in step.
function createTimeline(reel, scene) {
  const animations = [];
  const counters = [];
  const find = (name) => reel.querySelector(`[data-a="${name}"]`);

  // Each step is [time in ms, styles, easing into this step]. The first
  // styles hold from the start of the loop and the last until its end.
  const track = (name, steps) => {
    const frames = steps.map(([at, styles], i) => ({
      ...styles,
      offset: at / LOOP_MS,
      easing: steps[i + 1]?.[2] ?? EASE.out,
    }));
    if (frames[0].offset > 0) frames.unshift({ ...frames[0], offset: 0 });
    if (frames.at(-1).offset < 1) frames.push({ ...frames.at(-1), offset: 1 });
    animations.push(find(name).animate(frames, { duration: LOOP_MS, iterations: Infinity }));
  };

  // Springs in at `at`, pulses at each later time, and fades out over `exit`.
  const pop = (name, at, { pulse = [], exit } = {}) => {
    const shown = { opacity: 1, scale: 1 };
    const steps = [[at, { opacity: 0, scale: 0.5 }], [at + 450, shown, EASE.spring]];
    pulse.forEach((time) => {
      steps.push([time, shown], [time + 140, { opacity: 1, scale: 1.08 }], [time + 340, shown]);
    });
    if (exit) steps.push([exit[0], shown], [exit[1], { opacity: 0, scale: 1 }]);
    track(name, steps);
  };

  const fade = (name, at, ms = 300) => {
    track(name, [[at, { opacity: 0 }], [at + ms, { opacity: 1 }]]);
  };

  // Draws a stroke in, or from one fraction of its length to another.
  const draw = (name, at, ms, { from = 1, to = 0, easing = EASE.out } = {}) => {
    track(name, [[at, { strokeDashoffset: from }], [at + ms, { strokeDashoffset: to }, easing]]);
  };

  // Moves a dot through [time, x, y] points, fading it in and out at the ends.
  const travel = (name, points) => {
    const step = ([time, x, y], opacity) => [time, { opacity, translate: `${x}px ${y}px` }, 'linear'];
    const [first, last] = [points[0], points.at(-1)];
    track(name, [
      step([first[0] - 80, first[1], first[2]], 0),
      ...points.map((point) => step(point, 1)),
      step([last[0] + 80, last[1], last[2]], 0),
    ]);
  };

  // Steps for a quick side-to-side shake, for use inside a track.
  const jolt = (at) => [0, -6, 6, -5, 4, 0].map((x, i) => (
    [at + i * 80, { translate: `${x}px 0px`, rotate: '0deg' }, 'linear']
  ));

  // Text cannot be tweened by the browser, so numbers are set every frame.
  const count = (name, at, ms, to, format) => {
    counters.push({ node: find(name), at, ms, to, format });
  };

  track('stage', [
    [0, { opacity: 0 }],
    [250, { opacity: 1 }],
    [LOOP_MS - 350, { opacity: 1 }],
    [LOOP_MS, { opacity: 0 }],
  ]);
  draw('progress', 0, LOOP_MS, { easing: 'linear' });
  scene({ track, pop, fade, draw, travel, jolt, count, ease: EASE });

  return {
    animations,
    now: () => animations[0].currentTime % LOOP_MS,
    update(now) {
      counters.forEach(({ node, at, ms, to, format }) => {
        const progress = Math.min(1, Math.max(0, (now - at) / ms));
        const text = format(Math.round(to * (1 - (1 - progress) ** 3)));
        if (node.textContent !== text) node.textContent = text;
      });
    },
    restart() {
      animations.forEach((animation) => { animation.currentTime = 0; });
    },
  };
}
