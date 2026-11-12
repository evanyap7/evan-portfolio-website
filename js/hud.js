// The boot readout: three lines typed at the foot of the screen as the
// reactor wakes the room, once, on a visit that came in through the gate.
// Decoration only (aria-hidden); it does nothing without the scene, or with
// reduced motion.

const BOOT = ['ARC REACTOR ONLINE', 'WORKSHOP LIGHTS UP', 'ALL SYSTEMS READY'];
const BOOT_MS = 2600;

export function initHud() {
  const root = document.documentElement;
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
