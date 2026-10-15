// The cartoon's head turns a few pixels toward the pointer. Only with a
// mouse or trackpad, and only with motion allowed. CSS turns the two numbers
// set here, each from -1 to 1, into movement.

export function initLean() {
  const figure = document.querySelector('[data-wave]');
  const sheet = document.getElementById('top');
  if (!figure || !sheet) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;

  let frame = 0;
  let x = 0;
  let y = 0;
  const apply = () => {
    frame = 0;
    figure.style.setProperty('--lean-x', x.toFixed(3));
    figure.style.setProperty('--lean-y', y.toFixed(3));
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };
  const clamp = (value) => Math.max(-1, Math.min(1, value));

  sheet.addEventListener('pointermove', (event) => {
    const box = figure.getBoundingClientRect();
    x = clamp((event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2));
    y = clamp((event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2));
    queue();
  }, { passive: true });

  sheet.addEventListener('pointerleave', () => {
    x = 0;
    y = 0;
    queue();
  });
}
