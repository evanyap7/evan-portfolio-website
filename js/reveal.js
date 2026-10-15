// Fades and lifts content in the first time it scrolls into view. The
// hidden starting state is scoped to .js in CSS, so nothing is hidden if
// this never runs.

export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  const show = (target) => target.classList.add('is-visible');

  if (!('IntersectionObserver' in window)) {
    targets.forEach(show);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  targets.forEach((target) => observer.observe(target));
}
