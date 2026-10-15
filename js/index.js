// The sheet index in the bar and the menu, and the progress line under the
// bar. The index marks the sheet under the middle of the screen (or the last
// sheet once the page is scrolled to the end). Driven by scroll position
// rather than IntersectionObserver so it also works inside iframes.

export function initIndex() {
  const sheets = [...document.querySelectorAll('main > .sheet')];
  if (!sheets.length) return;

  const links = [...document.querySelectorAll('.ticks a, .menu__sheets a')];
  const number = document.querySelector('[data-where-n]');
  const name = document.querySelector('[data-where-name]');
  let current = null;

  const pick = () => {
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) return sheets[sheets.length - 1];
    const middle = window.innerHeight / 2;
    return [...sheets].reverse().find((sheet) => sheet.getBoundingClientRect().top <= middle) ?? sheets[0];
  };

  const progress = document.querySelector('[data-progress]');
  const fill = () => {
    if (!progress) return;
    const room = document.documentElement.scrollHeight - window.innerHeight;
    const done = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
    progress.style.transform = `scaleX(${done.toFixed(4)})`;
  };

  const update = () => {
    fill();
    const sheet = pick();
    if (sheet === current) return;
    current = sheet;
    const hash = `#${sheet.id}`;
    links.forEach((link) => {
      if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (number) number.textContent = sheet.dataset.sheet;
    if (name) name.textContent = sheet.dataset.sheetName;
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

