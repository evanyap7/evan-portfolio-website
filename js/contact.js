import { CONTACT_EMAIL } from './config.js';

// The copy button beside the address on the Contact sheet. When the
// clipboard refuses (an older browser, or a page without focus) it selects
// the address instead, so it can be copied by hand.

export function initCopy() {
  const button = document.querySelector('[data-copy]');
  const address = document.querySelector('.contact__address');
  const status = document.querySelector('[data-copy-status]');
  if (!button || !address) return;

  let timer = 0;
  const say = (label, message) => {
    button.textContent = label;
    if (status) status.textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  };

  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      say('Copied', 'Email address copied');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      say('Selected', 'Email address selected');
    }
  });
}
