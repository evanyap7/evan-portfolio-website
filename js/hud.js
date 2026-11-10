// The readouts along the foot of the room (the .hud in index.html): Singapore
// time, which stop the camera is at, and how far down the page the visitor is.
// And, once, the boot readout: three lines typed at the foot of the screen
// as the reactor wakes the room. Decoration only; it does nothing on a page
// without the markup.

const NAMES = { top: 'Start', about: 'About', work: 'Work', experience: 'Experience', toolkit: 'Toolkit', contact: 'Contact' };
const ORDER = Object.keys(NAMES);
const BOOT = ['ARC REACTOR ONLINE', 'WORKSHOP LIGHTS UP', 'ALL SYSTEMS READY'];
const BOOT_MS = 2600;

export function initHud() {
  const time = document.querySelector('[data-hud-time]');
  const stop = document.querySelector('[data-hud-stop]');
  const scroll = document.querySelector('[data-hud-scroll]');
  if (!time || !stop || !scroll) return;
  const root = document.documentElement;
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false });

  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const tick = () => setText(time, `SGT ${clock.format(new Date())}`);
  const where = () => {
    const id = root.dataset.stop || 'top';
    const n = Math.max(0, ORDER.indexOf(id));
    setText(stop, `${String(n).padStart(2, '0')} / ${NAMES[id] ?? id}`);
  };
  const along = () => {
    const room = document.documentElement.scrollHeight - window.innerHeight;
    const pct = room > 0 ? Math.min(100, Math.round((window.scrollY / room) * 100)) : 0;
    setText(scroll, `${String(pct).padStart(3, '0')} / 100`);
  };

  tick();
  where();
  along();
  setInterval(tick, 15000);
  new MutationObserver(where).observe(root, { attributes: true, attributeFilter: ['data-stop'] });
  window.addEventListener('scroll', along, { passive: true });

  if (!root.classList.contains('lab') || !root.classList.contains('gated')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('portfolio:waking', () => {
    const boot = document.createElement('p');
    boot.className = 'boot mono';
    boot.setAttribute('aria-hidden', 'true');
    BOOT.forEach((line, n) => {
      const row = document.createElement('span');
      row.style.setProperty('--n', n);
      const index = document.createElement('i');
      index.textContent = String(n + 1).padStart(2, '0');
      row.append(index, line);
      boot.append(row);
    });
    document.body.append(boot);
    window.setTimeout(() => boot.classList.add('is-done'), BOOT_MS);
    window.setTimeout(() => boot.remove(), BOOT_MS + 600);
  }, { once: true });
}
