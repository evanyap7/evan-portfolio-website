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
  const phone = window.matchMedia('(max-width: 719px)');
  const $ = (id) => document.getElementById(id);
  const fig = chapter.querySelector('.opener__suit');
  const stats = [...chapter.querySelectorAll('.stat')];
  const swatches = [...chapter.querySelectorAll('.swatch i')];
  const art = $('p-art');
  const artImg = art?.querySelector('img');
  const paper = chapter.querySelector('.paper');
  const pinned = window.matchMedia('(min-width: 1024px) and (min-height: 700px)');
  const onTrack = () => root.classList.contains('marks-track');
  let current = FIRST;
  let swapTimer = 0;

  // A sheet's words: the line, the links, the points and the stack, found by
  // class so the track's copies (which carry no ids) fill the same way.
  const fill = (sheet, p) => {
    const head = sheet.querySelector('.paper__mark');
    if (head) head.textContent = `Mark ${p.mark}, ${p.name}`;
    sheet.querySelector('.paper__line').textContent = p.line.join('');
    sheet.querySelector('.paper__sub').textContent = p.sub;
    sheet.querySelector('.ctas').replaceChildren(...p.links.map(([text, href]) => {
      const a = el('a', `${text} `, 'cta');
      a.href = href;
      const arrow = el('span', '→');
      arrow.setAttribute('aria-hidden', 'true');
      a.append(arrow);
      return a;
    }));
    sheet.querySelector('.points').replaceChildren(...p.rows.map(([head, body]) => {
      const li = el('li');
      li.append(el('h4', head), el('p', body));
      return li;
    }));
    const stack = sheet.querySelector('.stack');
    stack.replaceChildren(...p.stack.map((item) => el('li', item)));
    stack.hidden = !p.stack.length;
  };

  // The name fills the stage: one word across it, or a long name on several
  // lines, with the figures moved to the stage's edges (editions.css).
  const fitOnce = () => {
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // On a phone the name shares the first screen with the figures, so it
    // stays to two short lines.
    const h = phone.matches ? 108 : narrow.matches ? 168 : (stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * 0.9;
    let lo = 32;
    let hi = Math.max(lo, Math.min(phone.matches ? 76 : 520, w * 0.36));
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
    const now = $('p-now');
    if (now) now.textContent = `${p.mark} / VII · ${p.name}`;
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
    // The interlude carries the next project's line, so it wears its paint.
    chapter.style.setProperty('--suit-next', next.colours[0]);
    if (swatches[1]) swatches[1].hidden = !p.colours[1];
    // The plate behind the suit, if this Mark has one.
    if (art && artImg) {
      art.hidden = !p.art;
      if (p.art) {
        const src = `img/art/${p.art.file}`;
        if (!artImg.src.endsWith(src)) artImg.src = src;
        artImg.style.objectPosition = p.art.focus || '';
      }
    }
    // On the track every Mark has its own sheet; otherwise the one sheet
    // shows the chosen Mark.
    if (!onTrack()) fill(paper, p);
    $('n-line').replaceChildren(next.line.join(''));
    $('n-mark').textContent = `Next project · ${next.mark}`;
    $('n-name').textContent = next.name;
    fig?.classList.toggle('nostill', !p.still);
    fitName();
  };

  const pickers = [];
  // On a phone the picker scrolls sideways: bring the chosen chip into the
  // row's view, moving only the row, never the page.
  const reveal = (i) => {
    const chip = marksBox.querySelector(`button[data-mark="${i}"]`);
    if (!chip || marksBox.scrollWidth <= marksBox.clientWidth) return;
    const pad = parseFloat(getComputedStyle(marksBox).paddingLeft) || 0;
    const left = chip.offsetLeft - marksBox.offsetLeft - pad;
    const right = left + chip.offsetWidth + 2 * pad + 28;
    if (left < marksBox.scrollLeft) marksBox.scrollTo({ left, behavior: still ? 'auto' : 'smooth' });
    else if (right > marksBox.scrollLeft + marksBox.clientWidth) marksBox.scrollTo({ left: right - marksBox.clientWidth, behavior: still ? 'auto' : 'smooth' });
  };
  const select = (i, { instant = false } = {}) => {
    if (i === current) return;
    current = i;
    const p = MARKS[i];
    pickers.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.mark) === i)));
    reveal(i);
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

  // The track: on a screen that pins the opener, the chapter is read by
  // scrolling. Each Mark has a sheet; the opener shows the Mark whose sheet
  // comes next, and changes while a sheet covers it whole (editions.css).
  const sheets = [paper];
  const showSheet = (parts) => {
    const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      seen.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px' });
    parts.forEach((part) => seen.observe(part));
  };
  const build = () => {
    if (sheets.length > 1) return;
    let last = paper;
    MARKS.slice(1).forEach((p) => {
      const sheet = paper.cloneNode(true);
      sheet.querySelector('.paper__all')?.remove();
      sheet.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
      sheet.classList.add('paper--more');
      fill(sheet, p);
      last.after(sheet);
      last = sheet;
      sheets.push(sheet);
    });
    const parts = sheets.slice(1).flatMap((sheet) => [...sheet.querySelectorAll('[data-reveal]')]);
    parts.forEach((part) => part.classList.remove('is-visible'));
    if ('IntersectionObserver' in window && !still) showSheet(parts);
    else parts.forEach((part) => part.classList.add('is-visible'));
  };
  // Each sheet is named for a screen reader; the opener's name changes as
  // the page scrolls, so it cannot stand for the sheet below it.
  const mark = el('h3', null, 'paper__mark visually-hidden');
  paper.prepend(mark);

  // The Mark on show: one past each sheet that has passed the middle of the
  // stretch where it covers the screen whole. A sheet is taller than the
  // screen (editions.css), so a quick scroll still swaps the Mark unseen.
  const follow = () => {
    if (!onTrack()) return;
    const vh = window.innerHeight;
    select(sheets.slice(0, -1).filter((sheet) => {
      const r = sheet.getBoundingClientRect();
      return r.top <= (vh - r.height) / 2;
    }).length, { instant: true });
  };
  // To a Mark on the track: the start of the moment its opener shows whole.
  const goTo = (i) => {
    const y = window.scrollY;
    const top = i === 0 ? chapter.getBoundingClientRect().top : sheets[i - 1].getBoundingClientRect().bottom + 2;
    // Instant, past the page's smooth scrolling: gliding there would show
    // every Mark on the way.
    window.scrollTo({ top: Math.round(top + y), behavior: 'instant' });
  };
  const choose = (i) => {
    if (!onTrack()) return select(i);
    select(i, { instant: true });
    goTo(i);
  };
  const setTrack = () => {
    const on = pinned.matches && !still;
    if (on === onTrack()) return;
    if (on) build();
    root.classList.toggle('marks-track', on);
    fill(paper, MARKS[on ? 0 : current]);
    if (on) follow();
  };

  const toChapter = () => chapter.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });

  marksBox.append(...MARKS.map((p, i) => picker(p, i, true)));
  marksBox.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) choose(Number(button.dataset.mark));
  });
  const rail = document.querySelector('[data-rail-marks]');
  rail?.append(...MARKS.map((p, i) => picker(p, i, false)));
  rail?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    choose(Number(button.dataset.mark));
    if (!onTrack()) toChapter();
  });
  // The link itself goes to the chapter; the click moves on a Mark.
  $('n-link')?.addEventListener('click', () => select((current + 1) % MARKS.length));

  root.classList.add('marks-on');
  render(MARKS[current]);
  setTrack();
  pinned.addEventListener('change', setTrack);

  let queued = 0;
  window.addEventListener('scroll', () => {
    if (queued || !onTrack()) return;
    queued = window.requestAnimationFrame(() => {
      queued = 0;
      follow();
    });
  }, { passive: true });

  // A link to one project (#work-<slug>) picks its Mark. The old cards are
  // hidden while the picker is on, so the chapter is what the link lands on.
  const land = () => {
    const slug = window.location.hash.match(/^#work-(.+)$/)?.[1];
    if (!slug || !(slug in SLUGS)) return;
    const i = SLUGS[slug];
    select(i, { instant: true });
    window.requestAnimationFrame(() => (onTrack() ? goTo(i) : chapter.scrollIntoView({ behavior: 'auto' })));
  };
  land();
  window.addEventListener('hashchange', land);

  window.addEventListener('resize', fitName);
  document.fonts?.ready.then(fitName);
}
