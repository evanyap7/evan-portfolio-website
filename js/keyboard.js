// Presses the keys one after another, in DOM order, and gets out of the
// way whenever someone is using the keyboard themselves.

const STEP_MS = 340;
const HOLD_MS = 210;
const REST_MS = 1500;

export function initKeyboard() {
  const stage = document.querySelector('[data-keyboard]');
  if (!stage) return;

  const keys = [...stage.querySelectorAll('.key')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let index = 0;
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
    key.classList.add('is-pressed');
    releaseTimer = setTimeout(() => key.classList.remove('is-pressed'), HOLD_MS);

    const isLast = index === keys.length - 1;
    index = isLast ? 0 : index + 1;
    stepTimer = setTimeout(step, isLast ? STEP_MS + REST_MS : STEP_MS);
  };

  const sync = () => {
    const shouldRun = !reducedMotion.matches && !pointerInside && !focusInside && !document.hidden;
    if (!shouldRun) {
      stop();
    } else if (!stepTimer) {
      stepTimer = setTimeout(step, STEP_MS);
    }
  };

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
}
