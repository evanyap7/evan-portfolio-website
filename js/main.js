import { CONTACT_EMAIL } from './config.js';
import { initCopy } from './contact.js';
import { initCount } from './count.js';
import { initDeck } from './deck.js';
import { initFx } from './fx.js';
import { initGate } from './gate.js';
import { initHud } from './hud.js';
import { initIndex } from './index.js';
import { initKit } from './kit.js';
import { initLab } from './lab.js';
import { initMenu } from './menu.js';
import { initMotion } from './motion.js';
import { initProjects } from './projects.js';
import { initReactor } from './reactor.js';
import { initReveal } from './reveal.js';
import { initSuit } from './suit.js';

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
  if (window.matchMedia('not all').matches) return;

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    import('./reel.js').then(({ startReels }) => startReels(reels));
  }, { rootMargin: '200px' });

  reels.forEach((reel) => observer.observe(reel));
}

initGate();
initLab();
initHud();
applyContactEmail();
initMenu();
initIndex();
initKit();
initCount();
initCopy();
initReveal();
initMotion();
initFx();
initReactor();
// The suit listens for the picker's choice, so it is set up first: a link to
// one project picks its Mark as the picker starts.
initSuit();
initProjects();
initDeck();
initReels();
