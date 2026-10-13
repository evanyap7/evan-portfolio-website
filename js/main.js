import { CONTACT_EMAIL } from './config.js';
import { initCountup } from './countup.js';
import { initKeyboard } from './keyboard.js';
import { initKinetic } from './kinetic.js';
import { initMarquee } from './marquee.js';
import { initProjects } from './projects.js';
import { initReveal } from './reveal.js';
import { initScrollspy } from './scrollspy.js';
import { initTabs } from './tabs.js';

function applyContactEmail() {
  document.querySelectorAll('[data-contact-link]').forEach((link) => {
    link.href = `mailto:${CONTACT_EMAIL}`;
  });
  document.querySelectorAll('[data-contact-text]').forEach((node) => {
    node.textContent = CONTACT_EMAIL;
  });
}

// The backdrop is decorative, so it only loads when the contact section is
// close and the visitor has not asked for reduced motion.
function initShader() {
  const canvas = document.querySelector('[data-shader]');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    import('./shader.js').then(({ startShader }) => startShader(canvas));
  }, { rootMargin: '400px' });

  observer.observe(canvas);
}

// The project diagrams are drawn finished in the HTML, so the player is only
// fetched once one is on screen in an open card, and never with reduced motion.
function initReels() {
  const reels = document.querySelectorAll('[data-reel]');
  if (!reels.length || !('animate' in Element.prototype)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    import('./reel.js').then(({ startReels }) => startReels(reels));
  }, { rootMargin: '200px' });

  reels.forEach((reel) => observer.observe(reel));
}

applyContactEmail();
initKeyboard();
initMarquee();
initTabs();
initKinetic();
initReveal();
initScrollspy();
initProjects();
initCountup();
initShader();
initReels();
