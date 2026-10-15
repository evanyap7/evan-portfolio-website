// Counts each [data-count] number up from zero the first time it comes into
// view. Only the digits move; the rest of each string ("~", "%", "$", "M",
// "/", "–") stays as written, and the final text is what the HTML already
// holds, so with reduced motion or without this script nothing changes.

const NUMBER = /\d+(?:\.\d+)?/g;
const DURATION = 900;

function count(node) {
  const final = node.textContent;
  const parts = final.split(NUMBER);
  const values = final.match(NUMBER);
  if (!values) return;
  const decimals = values.map((value) => (value.split('.')[1] ?? '').length);

  // Hold the final width so nothing beside the number moves.
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
  const nodes = document.querySelectorAll('[data-count]');
  if (!nodes.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      count(entry.target);
    });
  }, { threshold: 0.6 });
  nodes.forEach((node) => observer.observe(node));
}
