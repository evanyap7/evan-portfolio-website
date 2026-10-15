// The full-screen menu that holds the navigation below 1024px wide.
// A plain button toggling `hidden`, so it works in every supported browser.

export function initMenu() {
  const button = document.querySelector('[data-menu-button]');
  const menu = document.getElementById('menu');
  // Everything the menu covers: the page and its footer.
  const behind = [document.getElementById('main'), document.querySelector('body > .footer')].filter(Boolean);
  if (!button || !menu) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    // The menu covers the page, so keep focus and screen readers out of it.
    behind.forEach((node) => { node.inert = open; });
    document.documentElement.classList.toggle('menu-open', open);
  };

  button.addEventListener('click', () => setOpen(menu.hidden));

  // Choosing a section closes the menu and lets the page scroll to it.
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menu.hidden) return;
    setOpen(false);
    button.focus();
  });

  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}
