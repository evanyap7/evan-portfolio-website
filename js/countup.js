// Rolls the larger figures up to their value the first time they are seen.
// Screen readers get the final text; the animated copy is hidden from them.

const DURATION_MS = 900;
const SINGLE_NUMBER = /^(\D*)(\d+)(\D*)$/;

export function initCountup() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.figure dd, .project__stat strong').forEach((node) => {
    const match = node.textContent.trim().match(SINGLE_NUMBER);
    // Ranges, ratios and single digits stay as they are.
    if (!match || Number(match[2]) < 10) return;

    const [text, prefix, digits, suffix] = match;
    const spoken = document.createElement('span');
    spoken.className = 'visually-hidden';
    spoken.textContent = text;
    const shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = `${prefix}0${suffix}`;
    node.replaceChildren(spoken, shown);

    shown.count = { prefix, target: Number(digits), suffix };
    observer.observe(shown);
  });
}

function run(node) {
  const { prefix, target, suffix } = node.count;
  const start = performance.now();

  const frame = (now) => {
    const progress = Math.min(1, (now - start) / DURATION_MS);
    const eased = 1 - (1 - progress) ** 3;
    node.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
