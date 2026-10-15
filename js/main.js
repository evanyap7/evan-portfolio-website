import { CONTACT_EMAIL } from './config.js';
import { initCopy } from './contact.js';
import { initCount } from './count.js';
import { initIndex } from './index.js';
import { initMenu } from './menu.js';
import { initReveal } from './reveal.js';
import { initTabs } from './tabs.js';

// Every page loads this one script. Each part looks for its own markup and
// does nothing on a page without it.

function applyContactEmail() {
  document.querySelectorAll('[data-contact-link]').forEach((link) => {
    link.href = `mailto:${CONTACT_EMAIL}`;
  });
  document.querySelectorAll('[data-contact-text]').forEach((node) => {
    node.textContent = CONTACT_EMAIL;
  });
}

// The project diagrams are drawn finished in the HTML, so the player is only
// fetched once one is near the screen, and never with reduced motion.
// Browsers that cannot animate `scale` and `translate` keep the still.
function initReels() {
  const reels = document.querySelectorAll('[data-reel]');
  if (!reels.length || !('animate' in Element.prototype)) return;
  if (!window.CSS?.supports('scale', '1')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    import('./reel.js').then(({ startReels }) => startReels(reels));
  }, { rootMargin: '200px' });

  reels.forEach((reel) => observer.observe(reel));
}

applyContactEmail();
initMenu();
initIndex();
initCount();
initTabs();
initCopy();
initReveal();
initReels();
