// Counts the numbers in a project up from zero the first time its panel is
// opened on screen: the figures under the summary and the key figure in its
// row. Only the digits move; the rest of each string ("~", "%", "$", "M",
// "/", "–") stays as written, and the final text is what the HTML already
// holds, so with reduced motion or without this script nothing changes.

const NUMBER = /\d+(?:\.\d+)?/g;
const DURATION = 800;

function count(node) {
  const final = node.textContent;
  const parts = final.split(NUMBER);
  const values = final.match(NUMBER);
  if (!values) return;
  const decimals = values.map((value) => (value.split('.')[1] ?? '').length);

  // Hold the final width so neither the row nor the text beside it moves.
  node.style.minWidth = `${node.getBoundingClientRect().width}px`;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / DURATION);
    const eased = 1 - (1 - progress) ** 3;
    node.textContent = parts.reduce((text, part, i) => (
      i < values.length ? text + part + (values[i] * eased).toFixed(decimals[i]) : text + part
    ), '');
    if (progress < 1) requestAnimationFrame(step);
    else node.textContent = final;
  };
  requestAnimationFrame(step);
}

export function initCount() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const work = document.getElementById('work');
  const panels = [...document.querySelectorAll('.project__panel')];
  if (!work || !panels.length || !('IntersectionObserver' in window)) return;

  const done = new WeakSet();
  let seen = false;
  const play = (panel) => {
    if (!seen || panel.hidden || done.has(panel)) return;
    done.add(panel);
    const row = document.querySelector(`[aria-controls="${panel.id}"]`);
    [...panel.querySelectorAll('.figures dd'), row?.querySelector('.project__key')]
      .filter(Boolean)
      .forEach(count);
  };

  panels.forEach((panel) => panel.addEventListener('project-toggle', () => play(panel)));

  // The panel open on load counts once the sheet first comes into view.
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    seen = true;
    panels.forEach(play);
  }, { threshold: 0.25 });
  observer.observe(work);
}
