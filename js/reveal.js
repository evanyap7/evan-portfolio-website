// Fades and lifts content in the first time it scrolls into view. The
// hidden starting state is scoped to .js in CSS, and a CSS failsafe shows
// everything after a few seconds unless this has marked the page
// `reveal-ready`, so nothing stays hidden if this never runs.

// The parts of a project page that rise in as they are scrolled to. Tagged
// here rather than in each page's markup; anything already on screen is left
// alone, so nothing flashes hidden at load. Siblings in a row or list rise
// one after another.
const PROJECT_PARTS = '.project .stats > div, .project__figure, .project__body > div, .items > li, .case__body > *, a.next';

function tagProjectParts() {
  document.querySelectorAll(PROJECT_PARTS).forEach((part) => {
    if (part.hasAttribute('data-reveal') || part.getBoundingClientRect().top < window.innerHeight) return;
    const siblings = [...part.parentElement.children].filter((el) => el.matches(PROJECT_PARTS));
    part.style.setProperty('--d', `${Math.min(siblings.indexOf(part), 3) * 90}ms`);
    part.setAttribute('data-reveal', '');
  });
}

export function initReveal() {
  document.documentElement.classList.add('reveal-ready');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) tagProjectParts();
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
