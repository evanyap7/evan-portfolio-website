// The Hall of Armor, page side. It sits above the Work cards and reads its
// words and numbers from them, so the cards stay the one source of truth (and
// the plain list of every project for anyone without WebGL). Each project is
// a suit: a Mark number, a codename and a core drawn in three.js
// (hall-scene.js). Pick a suit and it assembles through four render passes,
// blueprint, wireframe, shaded, lit; each pass can also be picked by hand.
// With reduced motion every change is instant and nothing loops.

import { whenActive } from './gate.js';

// In order of importance. Only EGO has a codename of its own (it is the
// assistant's name); every other suit goes by its project. `spec` shapes the
// suit: hue (its light and the HUD), bulk, facets, helmet, chest emblem,
// extras, and the lit colourway.
const SUITS = [
  { id: 'trading-agent', mark: 'I', spec: { hue: 46, bulk: 1.14, facets: 8, helm: 'slit', emblem: { sides: 4, turn: Math.PI / 4 }, extras: ['pack'], look: { plate: 0x7b8188, trim: 0x4e545b, rough: 0.5 } } },
  { id: 'assistant-bot', mark: 'II', code: 'EGO', spec: { hue: 196, bulk: 1, facets: 20, helm: 'visor', emblem: { sides: 32 }, look: { plate: 0xe4e7eb, trim: 0x9aa3ad, rough: 0.18 } } },
  { id: 'research-agent', mark: 'III', spec: { hue: 140, bulk: 1.02, facets: 16, helm: 'dome', emblem: { sides: 6 }, look: { plate: 0x2f6b4f, trim: 0xc07a45, rough: 0.3 } } },
  { id: 'parallel-match', mark: 'IV', spec: { hue: 78, bulk: 1.08, facets: 12, helm: 'hex', emblem: { sides: 5 }, extras: ['pack'], look: { plate: 0x223e70, trim: 0xdfe4ea, rough: 0.3 } } },
  { id: 'website-revamp', mark: 'V', spec: { hue: 265, bulk: 0.96, facets: 20, helm: 'dome', emblem: { sides: 4 }, look: { plate: 0x3a3d44, trim: 0xb8bec6, rough: 0.22 } } },
  { id: 'v-bay', mark: 'VI', spec: { hue: 330, bulk: 1, facets: 10, helm: 'visor', emblem: { sides: 6, turn: Math.PI / 6 }, extras: ['spines'], look: { plate: 0x5a2d4a, trim: 0xc9ccd2, rough: 0.28 } } },
  { id: 'others', mark: 'VII', spec: { hue: 16, bulk: 1.04, facets: 16, helm: 'crest', emblem: { sides: 8, turn: Math.PI / 8 }, extras: ['spines'], look: { plate: 0x8c5a2b, trim: 0x4fae8a, rough: 0.26 } } },
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

function mount(suits) {
  const root = element('div', 'hall');
  root.hidden = true;
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
  const status = element('p', 'hall__status');
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
  title.after(ui.root);

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
    ui.root.style.setProperty('--suit-h', String(suit.spec.hue));
    ui.mark.textContent = suit.code ? `Mark ${suit.mark} · ${suit.code}` : `Mark ${suit.mark}`;
    ui.name.textContent = suit.name;
    ui.line.textContent = suit.line;
    ui.figure.textContent = suit.figure;
    ui.figureLabel.textContent = suit.figureLabel;
    ui.open.textContent = `${suit.more} →`;
    ui.open.href = suit.href;
    ui.suitButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    if (hall) {
      hall.setSuit(suit.spec, { instant: reduce });
      assemble();
    }
  };

  ui.passButtons.forEach((button) => button.addEventListener('click', () => goTo(Number(button.dataset.pass), true)));
  ui.suitButtons.forEach((button) => button.addEventListener('click', () => select(Number(button.dataset.suit))));
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

  select(0);
  showPass(3);

  const sync = () => {
    if (!hall || reduce) return;
    if (visible && !document.hidden) hall.start();
    else hall.stop();
  };

  const load = () => {
    import('./hall-scene.js').then(({ createHall }) => {
      hall = createHall(ui.canvas);
      ui.root.hidden = false;
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
    }).catch(() => {
      ui.root.remove();
    });
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
