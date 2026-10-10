// Turns the About panels into tabs. Without JS the tab bar stays hidden and
// every panel is simply shown one after another.

export function initTabs() {
  const root = document.querySelector('[data-tabs]');
  if (!root) return;

  const list = root.querySelector('[role="tablist"]');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
  const heading = document.querySelector('#about .section__head');

  list.hidden = false;

  const select = (index, { focus = false, updateHash = false } = {}) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
    if (updateHash) history.replaceState(null, '', index === 0 ? '#about' : `#${panels[index].id}`);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, { updateHash: true }));

    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      const next = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next, { focus: true, updateHash: true });
    });
  });

  // Open the tab that holds `id`, then scroll once its panel is visible.
  // Returns false when the id is not inside one of the panels.
  const reveal = (id) => {
    const target = document.getElementById(id);
    const panel = target?.closest('[role="tabpanel"]');
    if (!panel || !panels.includes(panel)) return false;

    select(panels.indexOf(panel));
    const scrollTo = target === panel ? heading : target;
    requestAnimationFrame(() => scrollTo.scrollIntoView());
    return true;
  };

  // Links like #experience or #education. Handled on click because following
  // a link to the hash the URL already has fires no hashchange event.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;

    const id = decodeURIComponent(link.hash.slice(1));
    if (!reveal(id)) return;

    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  });

  // Back and forward buttons, and links typed into the address bar.
  window.addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!reveal(id) && id === 'about') select(0);
  });

  select(0);
  reveal(decodeURIComponent(location.hash.slice(1)));
}
