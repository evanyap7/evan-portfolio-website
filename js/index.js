// Marks the nav and menu link of the section under the middle of the screen
// (or the last section once the page is scrolled to the end), and scales the
// progress line along the top of the screen. Driven by scroll position rather
// than IntersectionObserver so it also works inside iframes.

export function initIndex() {
  const progress = document.querySelector('[data-progress]');
  const sections = [...document.querySelectorAll('main > section[id]')];
  const links = [...document.querySelectorAll('.nav__links a, .menu__links a')];
  const named = sections.filter((section) => links.some((link) => link.getAttribute('href') === `#${section.id}`) || section.id === 'top');
  let current = null;

  const pick = () => {
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) return named[named.length - 1];
    const middle = window.innerHeight / 2;
    return [...named].reverse().find((section) => section.getBoundingClientRect().top <= middle) ?? named[0];
  };

  const fill = () => {
    if (!progress) return;
    const room = document.documentElement.scrollHeight - window.innerHeight;
    const done = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
    progress.style.transform = `scaleX(${done.toFixed(4)})`;
  };

  const update = () => {
    fill();
    if (!named.length) return;
    const section = pick();
    if (section === current) return;
    current = section;
    const hash = `#${section.id}`;
    links.forEach((link) => {
      if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // A reload can restore the scroll position without a scroll event.
  window.addEventListener('load', update);
  update();
}
