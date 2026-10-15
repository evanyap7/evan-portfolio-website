// Selected work. Each project is a row button and a panel. From 1024px wide
// the rows sit on the left and the open project's panel on the right, like
// tabs; narrower, each panel opens under its row, like an accordion. Either
// way at most one project is open, and a link such as #work-trading-agent
// opens that one.

const WIDE = window.matchMedia('(min-width: 1024px)');

export function initWork() {
  const list = document.querySelector('[data-projects]');
  if (!list) return;

  const rows = [...list.querySelectorAll('.project__row')];
  const panelOf = (row) => document.getElementById(row.getAttribute('aria-controls'));
  const isOpen = (row) => row.getAttribute('aria-expanded') === 'true';

  // Opens `target` and closes the rest; `null` closes them all. reel.js
  // listens for project-toggle to start and stop each diagram.
  const open = (target) => {
    rows.forEach((row) => {
      const panel = panelOf(row);
      const opening = row === target;
      const changed = panel.hidden === opening;
      row.setAttribute('aria-expanded', String(opening));
      panel.hidden = !opening;
      if (changed) panel.dispatchEvent(new CustomEvent('project-toggle'));
    });
  };

  // Closing a long panel above can pull the chosen row off the top of the
  // screen, so bring it back.
  const keepInView = (row) => {
    const bar = document.querySelector('.bar')?.offsetHeight ?? 0;
    if (row.getBoundingClientRect().top < bar) row.scrollIntoView({ block: 'start' });
  };

  const fromHash = () => {
    if (!location.hash.startsWith('#work-')) return null;
    return document.getElementById(location.hash.slice(1))?.querySelector('.project__row') ?? null;
  };

  // On wide screens the whole sheet is the useful view; on narrow ones,
  // the row itself.
  const reveal = (row) => {
    open(row);
    (WIDE.matches ? document.getElementById('work') : row).scrollIntoView({ block: 'start' });
  };

  rows.forEach((row, i) => {
    row.addEventListener('click', () => {
      if (isOpen(row) && WIDE.matches) return;
      open(isOpen(row) ? null : row);
      if (!WIDE.matches) keepInView(row);
    });

    // Up and Down, Home and End move between projects; on wide screens
    // they also open the project, as tabs would.
    row.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      const next = rows[(to + rows.length) % rows.length];
      next.focus();
      if (WIDE.matches) open(next);
    });
  });

  window.addEventListener('hashchange', () => {
    const row = fromHash();
    if (row) reveal(row);
  });

  // A wide screen always shows a project, even after a narrow one closed them all.
  WIDE.addEventListener('change', () => {
    if (WIDE.matches && !rows.some(isOpen)) open(rows[0]);
  });

  list.classList.add('is-ready');
  const linked = fromHash();
  open(linked ?? rows[0]);
  if (linked) requestAnimationFrame(() => reveal(linked));
}
