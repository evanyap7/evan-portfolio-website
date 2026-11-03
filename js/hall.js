// The Hall of Armor, page side. It takes the place of the Work cards and
// reads its words and numbers from them, so the cards stay the one source of
// truth (and the plain list of every project for anyone without WebGL).
// Projects without a suit are listed under it as Other projects. Each project is
// a suit: a Mark number, a codename and a film suit's 3D model drawn in
// three.js (hall-scene.js). Pick a suit and it assembles through four render passes,
// blueprint, wireframe, shaded, lit; each pass can also be picked by hand.
// With reduced motion every change is instant and nothing loops.

import { whenActive } from './gate.js';

// In order of importance, each project wearing the Mark of the same number.
// Only EGO has a codename of its own (it is the assistant's name); every other
// suit goes by its project. `hue` tints the HUD; `spec` is the armour: which
// model in models/hall/ it is, and, for a repainted suit, the colour its red
// panels take (base) and its gold panels (accent).
const SILVER = 0xb4bac2;
const SUITS = [
  { id: 'trading-agent', mark: 'I', hue: 30, spec: { model: 'mark-1' } },
  { id: 'assistant-bot', mark: 'II', code: 'EGO', hue: 205, spec: { model: 'mark-7', paint: { base: 0x6b727b, accent: 0x50575f, metal: 0.8, rough: 0.42 } } },
  { id: 'research-agent', mark: 'III', hue: 44, spec: { model: 'mark-7-lite' } },
  { id: 'parallel-match', mark: 'IV', hue: 2, spec: { model: 'mark-50', paint: { base: 0xb3120f, accent: 0xe0b04a } } },
  { id: 'website-revamp', mark: 'V', hue: 210, spec: { model: 'mark-7-lite', paint: { base: SILVER, accent: 0xa51d1b } } },
  { id: 'v-bay', mark: 'VI', hue: 18, spec: { model: 'mark-50' } },
  { id: 'others', mark: 'VII', hue: 48, spec: { model: 'mark-7' } },
];
const PASSES = ['Blueprint', 'Wireframe', 'Shaded', 'Lit'];
const STEP_MS = 1000;

function webgl2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Reads each suit's words off its Work card now, before the figures count up.
function readCards() {
  return SUITS.map((suit) => {
    const card = document.getElementById(`work-${suit.id}`);
    if (!card) return null;
    return {
      ...suit,
      label: card.querySelector('.label')?.textContent.trim() ?? '',
      figure: card.querySelector('.work__figure [data-count]')?.textContent.trim() ?? '',
      figureLabel: card.querySelector('.work__figure small')?.textContent.trim() ?? '',
      name: card.querySelector('.work__name')?.textContent.trim() ?? '',
      line: card.querySelector('.work__line')?.textContent.trim() ?? '',
      href: card.getAttribute('href'),
      more: card.querySelector('.work__more')?.firstChild?.textContent.trim() ?? 'Read more',
    };
  }).filter(Boolean);
}

// The projects that have no suit, as one plain row each.
function mountOthers(suits) {
  const taken = new Set(suits.map((suit) => suit.id));
  const cards = [...document.querySelectorAll('#work .work__card')].filter((card) => !taken.has(card.id.replace('work-', '')));
  if (!cards.length) return null;
  const root = element('div', 'others');
  const list = element('ul', 'others__list');
  list.setAttribute('aria-labelledby', 'others-title');
  const title = element('h3', 'others__title', 'Other projects');
  title.id = 'others-title';
  cards.forEach((card) => {
    const row = element('a', 'others__row');
    row.href = card.getAttribute('href');
    row.dataset.for = card.id.replace('work-', '');
    const figure = card.querySelector('.work__figure [data-count]')?.textContent.trim() ?? '';
    const unit = card.querySelector('.work__figure small')?.textContent.trim() ?? '';
    row.append(
      element('span', 'others__name', card.querySelector('.work__name')?.textContent.trim() ?? ''),
      element('span', 'others__line', card.querySelector('.work__line')?.textContent.trim().replace(/\s+/g, ' ') ?? ''),
      element('span', 'others__figure', `${figure} ${unit}`.trim()),
      element('span', 'others__arrow', '→'),
    );
    row.lastChild.setAttribute('aria-hidden', 'true');
    const item = element('li');
    item.append(row);
    list.append(item);
  });
  root.append(title, list);
  return root;
}

function mount(suits) {
  // Shown from the start, so its height is in the page before the browser
  // jumps to a #hash below it; only the canvas waits for three.js.
  const root = element('div', 'hall');
  root.dataset.hall = '';

  const stage = element('div', 'hall__stage');
  const canvas = element('canvas', 'hall__canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const hint = element('p', 'hall__hint', 'Click the suit for the next pass');
  stage.append(canvas, hint);

  const panel = element('div', 'hall__panel');
  const mark = element('p', 'hall__mark');
  const name = element('h3', 'hall__name');
  const line = element('p', 'hall__line');
  const spec = element('p', 'hall__spec');
  const figure = element('strong');
  const figureLabel = element('small');
  spec.append(figure, figureLabel);

  const passes = element('div', 'hall__passes');
  passes.setAttribute('role', 'group');
  passes.setAttribute('aria-label', 'Render pass');
  const passButtons = PASSES.map((label, index) => {
    const button = element('button', 'hall__pass', label);
    button.type = 'button';
    button.dataset.pass = String(index);
    passes.append(button);
    return button;
  });
  const status = element('p', 'hall__status visually-hidden');
  status.setAttribute('role', 'status');

  const open = element('a', 'hall__open');
  panel.append(mark, name, line, spec, passes, status, open);

  const picker = element('div', 'hall__suits');
  picker.setAttribute('role', 'group');
  picker.setAttribute('aria-label', 'Suit');
  const suitButtons = suits.map((suit, index) => {
    const button = element('button', 'hall__suit');
    button.type = 'button';
    button.dataset.suit = String(index);
    button.dataset.id = suit.id;
    button.append(element('span', 'hall__suit-mark', `Mark ${suit.mark}`), element('span', 'hall__suit-name', suit.code ?? suit.name));
    picker.append(button);
    return button;
  });

  root.append(stage, panel, picker);
  return { root, stage, canvas, mark, name, line, figure, figureLabel, open, status, passButtons, suitButtons };
}

export function initHall() {
  const work = document.getElementById('work');
  const title = document.getElementById('work-title');
  if (!work || !title || !webgl2()) return;
  const suits = readCards();
  if (!suits.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ui = mount(suits);
  const others = mountOthers(suits);
  title.after(ui.root);
  if (others) ui.root.after(others);
  // The Hall and the list replace the cards; the cards stay in the page for
  // search engines and come back if three.js fails to load.
  work.classList.add('work--hall');

  let hall = null;
  let current = 0;
  let pass = 3;
  let timers = [];
  let visible = false;

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const showPass = (next) => {
    pass = next;
    ui.passButtons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === next));
      button.classList.toggle('is-done', index < next);
    });
    ui.status.textContent = next === 3
      ? 'Pass 4 of 4: fully rendered.'
      : `Pass ${next + 1} of 4: ${PASSES[next].toLowerCase()}. ${3 - next} to go.`;
  };

  const goTo = (next, manual) => {
    if (manual) clearTimers();
    showPass(next);
    hall?.setPass(next, { instant: reduce });
  };

  // Builds the suit up from its blueprint to the finished core.
  const assemble = () => {
    clearTimers();
    if (reduce) {
      goTo(3);
      return;
    }
    hall.setPass(0, { instant: true });
    showPass(0);
    [1, 2, 3].forEach((next) => {
      timers.push(setTimeout(() => goTo(next), next * STEP_MS));
    });
  };

  const select = (index) => {
    current = index;
    const suit = suits[index];
    ui.root.style.setProperty('--suit-h', String(suit.hue));
    ui.mark.textContent = suit.code ? `Mark ${suit.mark} · ${suit.code}` : `Mark ${suit.mark}`;
    ui.name.textContent = suit.name;
    ui.line.textContent = suit.line;
    ui.figure.textContent = suit.figure;
    ui.figureLabel.textContent = suit.figureLabel;
    ui.open.textContent = `${suit.more} →`;
    ui.open.href = suit.href;
    ui.suitButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    if (hall) {
      clearTimers();
      hall.setSuit(suit.spec, { instant: reduce }).then((shown) => {
        if (shown) assemble();
      }, fail);
    }
  };

  // The Hall can't stand without its scene or a suit's model: back to the cards.
  const fail = () => {
    clearTimers();
    hall?.stop();
    hall = null;
    ui.root.remove();
    others?.remove();
    work.classList.remove('work--hall');
  };

  ui.passButtons.forEach((button) => button.addEventListener('click', () => goTo(Number(button.dataset.pass), true)));
  ui.suitButtons.forEach((button) => {
    const index = Number(button.dataset.suit);
    const warm = () => hall?.preload(suits[index].spec);
    button.addEventListener('click', () => select(index));
    button.addEventListener('pointerenter', warm);
    button.addEventListener('focus', warm);
  });
  ui.stage.addEventListener('click', () => goTo((pass + 1) % PASSES.length, true));
  ui.stage.addEventListener('pointermove', (event) => {
    if (!hall || event.pointerType === 'touch') return;
    const box = ui.stage.getBoundingClientRect();
    hall.state.tx = ((event.clientX - box.left) / box.width - 0.5) * 2;
    hall.state.ty = ((event.clientY - box.top) / box.height - 0.5) * 2;
  });
  ui.stage.addEventListener('pointerleave', () => {
    if (!hall) return;
    hall.state.tx = 0;
    hall.state.ty = 0;
  });

  // An old project link (#work-trading-agent) picks that suit and lands on
  // the Hall; a project without a suit lands on its row.
  const land = () => {
    const key = window.location.hash.replace(/^#work-/, '');
    if (key === window.location.hash) return false;
    const index = suits.findIndex((suit) => suit.id === key);
    const target = index >= 0 ? ui.root : others?.querySelector(`[data-for="${CSS.escape(key)}"]`);
    if (!target) return false;
    if (index >= 0 && index !== current) select(index);
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    return true;
  };

  select(Math.max(0, suits.findIndex((suit) => `#work-${suit.id}` === window.location.hash)));
  showPass(3);
  window.addEventListener('hashchange', land);
  // The browser's own jump aimed at a card that is now hidden, so land here,
  // and again once the page has loaded and fonts have settled its height.
  if (land() && document.readyState !== 'complete') {
    const from = window.scrollY;
    window.addEventListener('load', () => {
      if (Math.abs(window.scrollY - from) < 4) land();
    }, { once: true });
  }

  const sync = () => {
    if (!hall || reduce) return;
    if (visible && !document.hidden) hall.start();
    else hall.stop();
  };

  const load = () => {
    import('./hall-scene.js').then(({ createHall }) => {
      hall = createHall(ui.canvas);
      const fit = () => {
        const box = ui.stage.getBoundingClientRect();
        if (box.width && box.height) hall.resize(Math.round(box.width), Math.round(box.height));
      };
      fit();
      new ResizeObserver(fit).observe(ui.stage);
      select(current);
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(ui.stage);
      document.addEventListener('visibilitychange', sync);
    }).catch(fail);
  };

  // Fetch three.js and build the first core only once Work is near.
  whenActive(() => {
    if (!('IntersectionObserver' in window)) return;
    const near = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      load();
    }, { rootMargin: '700px' });
    near.observe(work);
  });
}
