// Presses the keys one after another, in DOM order, and gets out of the
// way whenever someone is using the keyboard themselves.

const STEP_MS = 340;
const HOLD_MS = 210;
const REST_MS = 1500;
// The first press waits for the headline and the lines under it to arrive.
const START_MS = 1800;
// On phones each key is named in the readout, so the pace drops to one a
// reader can follow.
const READ_STEP_MS = 1100;
const READ_HOLD_MS = 650;

const DESIGN_WIDTH = 900;

// Scales the whole composition to the space the hero gives it, never above 1.
function fitToContainer(stage) {
  const keyboard = stage.parentElement;
  const container = keyboard.parentElement;

  const fit = () => {
    const style = getComputedStyle(container);
    const available = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    keyboard.style.setProperty('--scale', Math.min(1, available / DESIGN_WIDTH).toFixed(4));
  };

  new ResizeObserver(fit).observe(container);
  fit();
}

export function initKeyboard() {
  const stage = document.querySelector('[data-keyboard]');
  if (!stage) return;

  fitToContainer(stage);

  const keys = [...stage.querySelectorAll('.key')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 719px)');
  const frame = stage.closest('.hero__keys');
  const announce = initReadout();

  let index = 0;
  let started = false;
  let stepTimer = 0;
  let releaseTimer = 0;
  let pointerInside = false;
  let focusInside = false;

  const releaseAll = () => keys.forEach((key) => key.classList.remove('is-pressed'));

  const stop = () => {
    clearTimeout(stepTimer);
    clearTimeout(releaseTimer);
    stepTimer = 0;
    releaseAll();
  };

  const step = () => {
    const key = keys[index];
    const [stepMs, holdMs] = compact.matches ? [READ_STEP_MS, READ_HOLD_MS] : [STEP_MS, HOLD_MS];
    key.classList.add('is-pressed');
    announce(key);
    releaseTimer = setTimeout(() => key.classList.remove('is-pressed'), holdMs);

    const isLast = index === keys.length - 1;
    index = isLast ? 0 : index + 1;
    stepTimer = setTimeout(step, isLast ? stepMs + REST_MS : stepMs);
  };

  const sync = () => {
    // The readout depends on the sequence, so it goes when the sequence does.
    frame.classList.toggle('has-readout', !reducedMotion.matches);
    const shouldRun = !reducedMotion.matches && !pointerInside && !focusInside && !document.hidden;
    if (!shouldRun) {
      stop();
    } else if (!stepTimer) {
      stepTimer = setTimeout(step, started ? STEP_MS : START_MS);
      started = true;
    }
  };

  stage.addEventListener('pointerdown', (event) => {
    const key = event.target.closest('.key');
    if (key) announce(key);
  });
  stage.addEventListener('pointerenter', () => { pointerInside = true; sync(); });
  stage.addEventListener('pointerleave', () => { pointerInside = false; sync(); });
  // Touch never fires pointerleave on scroll, so release the pause explicitly.
  stage.addEventListener('pointercancel', () => { pointerInside = false; sync(); });
  stage.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') { pointerInside = false; sync(); }
  });
  stage.addEventListener('focusin', () => { focusInside = true; sync(); });
  stage.addEventListener('focusout', () => { focusInside = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);

  sync();

  initTyping(stage, keys, initSound(stage));
}

// Names a key in the line under the keyboard, which CSS shows on phones only.
function initReadout() {
  const readout = document.querySelector('[data-keyboard-readout]');
  if (!readout) return () => {};

  const [chip, label] = readout.children;
  return (key) => {
    chip.textContent = key.querySelector('.key__letter')?.textContent ?? '↵';
    label.textContent = key.querySelector('.key__caption').textContent;
    readout.style.setProperty('--face', key.style.getPropertyValue('--face'));
  };
}

// A short filtered noise burst, close enough to a keycap bottoming out.
// Off until the visitor turns it on; the choice is remembered.
function initSound(stage) {
  const toggle = document.querySelector('[data-keyboard-sound]');
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!toggle || !AudioContext) return () => {};

  let context;
  let buffer;
  let enabled = false;
  try { enabled = localStorage.getItem('key-sounds') === 'on'; } catch { /* storage blocked */ }

  const play = () => {
    if (!enabled) return;
    context ??= new AudioContext();
    if (!buffer) {
      const length = Math.round(context.sampleRate * 0.045);
      buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = 0.9 + Math.random() * 0.2;
    filter.type = 'bandpass';
    filter.frequency.value = 1700;
    filter.Q.value = 0.9;
    gain.gain.value = 0.5;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  };

  const render = () => toggle.setAttribute('aria-pressed', String(enabled));
  toggle.hidden = false;
  render();
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('key-sounds', enabled ? 'on' : 'off'); } catch { /* storage blocked */ }
    render();
    play();
  });

  stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.key')) play();
  });

  return play;
}

// Typing a letter that is on a key presses that key and moves focus to it,
// so Enter then follows it like any other link. Only while the keyboard is
// on screen and the visitor is not typing somewhere else.
function initTyping(stage, keys, playSound) {
  const byName = new Map();
  keys.forEach((key) => {
    const letter = key.querySelector('.key__letter')?.textContent.trim().toLowerCase();
    const name = letter || 'enter';
    byName.set(name, [...(byName.get(name) ?? []), key]);
  });

  let onScreen = false;
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }, { threshold: 0.5 })
    .observe(stage);

  document.addEventListener('keydown', (event) => {
    if (!onScreen || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

    const active = document.activeElement;
    const insideStage = stage.contains(active);
    if (active && active !== document.body && !insideStage) return;

    const name = event.key.toLowerCase();
    const matches = byName.get(name);
    if (!matches) return;
    // Enter on a focused key is the link's own activation.
    if (name === 'enter' && insideStage) return;

    // Repeated letters (the three Os) cycle through their keys.
    const key = matches[(matches.indexOf(active) + 1) % matches.length];
    key.focus({ preventScroll: true });
    key.classList.add('is-pressed');
    setTimeout(() => key.classList.remove('is-pressed'), HOLD_MS);
    playSound();
  });
}
