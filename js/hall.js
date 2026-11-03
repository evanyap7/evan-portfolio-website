// The Hall of Armor, page side. It sits above the Work cards and reads its
// words and numbers from them, so the cards stay the one source of truth (and
// the plain list of every project for anyone without WebGL). Each project is
// a suit: a Mark number, a codename and a core drawn in three.js
// (hall-scene.js). Pick a suit and it assembles through four render passes,
// blueprint, wireframe, shaded, lit; each pass can also be picked by hand.
// With reduced motion every change is instant and nothing loops.

import { whenActive } from './gate.js';

// In order of importance. `spec` shapes the core; the rest is the label.
const SUITS = [
  { id: 'trading-agent', mark: 'I', code: 'Baseline', spec: { sides: 6, coils: 6, h: 0.8, bolts: 8, hue: 28 } },
  { id: 'assistant-bot', mark: 'II', code: 'EGO', spec: { sides: 64, coils: 10, h: 0.84, bolts: 10, hue: 196 } },
  { id: 'research-agent', mark: 'III', code: 'Cite', spec: { sides: 3, coils: 3, h: 0.6, bolts: 6, hue: 152 } },
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
  const hint = element('p', 'hall__hint', 'Click the core for the next pass');
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
    button.append(element('span', 'hall__suit-mark', `Mark ${suit.mark}`), element('span', 'hall__suit-name', suit.code));
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
    ui.mark.textContent = `Mark ${suit.mark} · ${suit.code}`;
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
