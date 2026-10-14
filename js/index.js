// The sheet index in the bar and the menu. It marks the sheet under the
// middle of the screen (or the last sheet once the page is scrolled to the
// end), and keeps the Singapore clock current. Driven by scroll position
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

  const update = () => {
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
  startClock();
}

function startClock() {
  const clocks = document.querySelectorAll('[data-clock]');
  if (!clocks.length) return;
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const tick = () => {
    const text = `SGT ${format.format(new Date())}`;
    clocks.forEach((clock) => { clock.textContent = text; });
  };
  tick();
  setInterval(tick, 15000);
}
