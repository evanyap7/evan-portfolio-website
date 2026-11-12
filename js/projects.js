// Projects: one chapter, seven Marks (js/marks.js), one project each.
// Choosing a Mark, in the chapter's picker or the rail's, changes the words
// on the stage and the light sheet below it, and tells the suit (suit.js)
// which armour to assemble. The page marks itself `marks-on`; without this
// script the chapter shows Mark II, and the list of every project below it.

import { MARKS } from './marks.js';

// Which Mark each project's old card (#work-<slug>) belongs to, so a link to
// a project lands on its Mark.
const SLUGS = {
  'trading-agent': 0,
  'assistant-bot': 1,
  'research-agent': 2,
  'parallel-match': 3,
  'website-revamp': 4,
  'v-bay': 5,
  watchpartyyy: 6,
  others: 6,
};
const FIRST = 1;
const SWAP_MS = 230;

const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};

export function initProjects() {
  const chapter = document.getElementById('work');
  const stage = chapter?.querySelector('.opener__stage');
  const name = document.getElementById('p-name');
  const marksBox = chapter?.querySelector('[data-marks]');
  if (!chapter || !stage || !name || !marksBox) return;

  const root = document.documentElement;
  const still = window.matchMedia('not all').matches;
  const narrow = window.matchMedia('(max-width: 1023px)');
  const $ = (id) => document.getElementById(id);
  const fig = chapter.querySelector('.opener__suit');
  const stats = [...chapter.querySelectorAll('.stat')];
  const swatches = [...chapter.querySelectorAll('.swatch i')];
  let current = FIRST;
  let swapTimer = 0;

  // The name fills the stage: one word across it, or a long name on several
  // lines, with the figures moved to the stage's edges (editions.css).
  const fitOnce = () => {
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = narrow.matches ? 168 : (stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * 0.9;
    let lo = 32;
    let hi = Math.max(lo, Math.min(520, w * 0.36));
    for (let i = 0; i < 9; i += 1) {
      const mid = (lo + hi) / 2;
      name.style.fontSize = `${mid}px`;
      if (name.scrollWidth <= Math.ceil(w) + 1 && name.offsetHeight <= h) lo = mid;
      else hi = mid;
    }
    name.style.fontSize = `${Math.floor(lo)}px`;
    return Math.floor(lo);
  };
  const fitName = () => {
    if (!stage.clientWidth) return;
    stage.classList.remove('long');
    if (fitOnce() * 1.3 < name.offsetHeight) {
      stage.classList.add('long');
      fitOnce();
    }
  };

  const render = (p) => {
    const next = MARKS[(MARKS.indexOf(p) + 1) % MARKS.length];
    $('p-mark').textContent = `Mark ${p.mark} of VII`;
    $('p-role').textContent = p.role;
    name.textContent = p.name;
    stats.forEach((stat, i) => {
      const chip = p.chips[i];
      stat.hidden = !chip;
      if (chip) {
        stat.children[0].textContent = chip[0];
        stat.children[1].textContent = chip[1];
      }
    });
    $('p-blurb').textContent = p.blurb;
    $('p-paint').textContent = p.paint;
    chapter.style.setProperty('--suit', p.colours[0]);
    chapter.style.setProperty('--suit-2', p.colours[1] || p.colours[0]);
    if (swatches[1]) swatches[1].hidden = !p.colours[1];
    $('p-label').textContent = `${p.mark} · ${p.name}`;
    $('p-line').textContent = p.line.join('');
    $('p-sub').textContent = p.sub;
    $('p-links').replaceChildren(...p.links.map(([text, href]) => {
      const a = el('a', `${text} `, 'cta');
      a.href = href;
      const arrow = el('span', '→');
      arrow.setAttribute('aria-hidden', 'true');
      a.append(arrow);
      return a;
    }));
    $('p-rows').replaceChildren(...p.rows.map(([head, body], i) => {
      const li = el('li');
      li.append(el('span', String(i + 1).padStart(2, '0'), 'mono'), el('h4', head), el('p', body));
      return li;
    }));
    $('p-stack').replaceChildren(...p.stack.map((item) => el('li', item)));
    $('p-stack').hidden = !p.stack.length;
    $('n-line').replaceChildren(next.line[0], el('span', next.line[1], 'serif'), next.line[2]);
    $('n-mark').textContent = `Next project · ${next.mark}`;
    $('n-name').textContent = next.name;
    fig?.classList.toggle('nostill', !p.still);
    fitName();
  };

  const pickers = [];
  const select = (i, { instant = false } = {}) => {
    if (i === current) return;
    current = i;
    const p = MARKS[i];
    pickers.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.mark) === i)));
    $('p-status').textContent = `Mark ${p.mark}, ${p.name}`;
    window.clearTimeout(swapTimer);
    chapter.classList.remove('swap');
    if (still || instant) render(p);
    else {
      chapter.classList.add('swap');
      swapTimer = window.setTimeout(() => {
        render(p);
        chapter.classList.remove('swap');
      }, SWAP_MS);
    }
    document.dispatchEvent(new CustomEvent('mark', { detail: { spec: p.spec, hue: p.hue, line: i * 40 } }));
  };

  const picker = (p, i, full) => {
    const button = el('button');
    button.type = 'button';
    button.dataset.mark = i;
    button.setAttribute('aria-pressed', String(i === current));
    if (full) button.append(el('b', p.mark), el('span', p.name));
    else {
      button.textContent = p.mark;
      button.setAttribute('aria-label', `Mark ${p.mark}, ${p.name}`);
    }
    pickers.push(button);
    return button;
  };

  const toChapter = () => chapter.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });

  marksBox.append(...MARKS.map((p, i) => picker(p, i, true)));
  marksBox.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) select(Number(button.dataset.mark));
  });
  const rail = document.querySelector('[data-rail-marks]');
  rail?.append(...MARKS.map((p, i) => picker(p, i, false)));
  rail?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    select(Number(button.dataset.mark));
    toChapter();
  });
  // The link itself goes to the chapter; the click moves on a Mark.
  $('n-link')?.addEventListener('click', () => select((current + 1) % MARKS.length));

  root.classList.add('marks-on');
  render(MARKS[current]);

  // A link to one project (#work-<slug>) picks its Mark. The old cards are
  // hidden while the picker is on, so the chapter is what the link lands on.
  const land = () => {
    const slug = window.location.hash.match(/^#work-(.+)$/)?.[1];
    if (!slug || !(slug in SLUGS)) return;
    select(SLUGS[slug], { instant: true });
    window.requestAnimationFrame(() => chapter.scrollIntoView({ behavior: 'auto' }));
  };
  land();
  window.addEventListener('hashchange', land);

  window.addEventListener('resize', fitName);
  document.fonts?.ready.then(fitName);
}
