import { CONTACT_EMAIL } from './config.js';
import { initKeyboard } from './keyboard.js';
import { initMarquee } from './marquee.js';

function applyContactEmail() {
  document.querySelectorAll('[data-contact-link]').forEach((link) => {
    link.href = `mailto:${CONTACT_EMAIL}`;
  });
  document.querySelectorAll('[data-contact-text]').forEach((node) => {
    node.textContent = CONTACT_EMAIL;
  });
}

applyContactEmail();
initKeyboard();
initMarquee();
