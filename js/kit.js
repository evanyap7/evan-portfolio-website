// On a phone the toolkit is a long list, so it starts folded behind one
// button; from a tablet up it is always open and the button is never shown.

export function initKit() {
  const button = document.querySelector('[data-kit-toggle]');
  const kit = document.getElementById('kit-tools');
  if (!button || !kit) return;
  const phone = window.matchMedia('(max-width: 719px)');
  const label = button.firstChild;

  const set = (open) => {
    kit.classList.toggle('is-folded', phone.matches && !open);
    button.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Hide the toolkit ' : 'Show the full toolkit ';
    button.lastElementChild.textContent = open ? '↑' : '↓';
  };
  const sync = () => {
    button.hidden = !phone.matches;
    set(!phone.matches);
  };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  phone.addEventListener('change', sync);
  sync();
}
