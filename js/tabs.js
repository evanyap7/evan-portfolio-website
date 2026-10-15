// The Toolkit section's four tabs: Toolkit, Recognition, Education and Certifications.
// Without this script the tab row stays hidden and every panel shows, one
// under another. With it, one panel shows at a time, the arrow keys, Home and
// End move between tabs (the WAI-ARIA tabs pattern, selecting as focus
// moves), and links such as #education open their tab.

export function initTabs() {
  const kit = document.querySelector('[data-kit]');
  const list = kit?.querySelector('[role="tablist"]');
  if (!list) return;

  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panelOf = (tab) => document.getElementById(tab.getAttribute('aria-controls'));

  tabs.forEach((tab) => {
    const panel = panelOf(tab);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
  });

  const select = (target, { focus = false } = {}) => {
    tabs.forEach((tab) => {
      const on = tab === target;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panelOf(tab).hidden = !on;
    });
    if (focus) target.focus();
    // On a phone the row scrolls sideways; keep the chosen tab in it.
    const row = list.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    if (box.left < row.left || box.right > row.right) {
      list.scrollLeft += box.left < row.left ? box.left - row.left : box.right - row.right;
    }
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], { focus: true });
    });
  });

  const fromHash = () => tabs.find((tab) => `#${tab.getAttribute('aria-controls')}` === location.hash) ?? null;
  const reveal = (tab) => {
    select(tab);
    document.getElementById('toolkit')?.scrollIntoView({ block: 'start' });
  };

  window.addEventListener('hashchange', () => {
    const tab = fromHash();
    if (tab) reveal(tab);
  });

  list.hidden = false;
  kit.classList.add('is-ready');
  const linked = fromHash();
  select(linked ?? tabs[0]);
  if (linked) requestAnimationFrame(() => reveal(linked));
}
