// The Hall of Armor, page side. It takes the place of the Work cards and
// reads its words and numbers from them, so the cards stay the one source of
// truth (and the plain list of every project for anyone without WebGL).
// Projects without a suit are listed under it as Other projects. Each project is
// a suit: a Mark number, a codename and a film suit's 3D model drawn in
// three.js (hall-scene.js). Pick a suit and it stands there fully lit, on show
// from every side: drag it round, or use the arrow keys.
// With reduced motion every change is instant and nothing loops.

import { whenActive } from './gate.js';
import { getLab } from './lab.js';

// In order of importance, each project wearing the Mark of the same number.
// Only EGO has a codename of its own (it is the assistant's name); every other
// suit goes by its project. `hue` tints the HUD; `spec` is the armour: which
// model in models/hall/ it is, for a repainted suit the colour its red panels
// take (base) and its gold panels (accent), and `tone`, the clay's colour in
// the shaded pass when the base won't do. Every suit wears its own colours.
const SUITS = [
  { id: 'trading-agent', mark: 'I', hue: 32, spec: { model: 'mark-1', tone: 0x6b5034 } },
  { id: 'assistant-bot', mark: 'II', code: 'EGO', hue: 4, spec: { model: 'mark-7', tone: 0x9c2219 } },
  { id: 'research-agent', mark: 'III', hue: 152, spec: { model: 'mark-7-lite', paint: { base: 0x0e7a4c, accent: 0xd7a83a } } },
  // Mark IV wears Manchester United's colours, United red with black trim, and
  // the club's crest on the left of the chest, where a kit's badge sits.
  { id: 'parallel-match', mark: 'IV', hue: 356, spec: { model: 'mark-50', tone: 0xb3141a, paint: { base: 0xda291c, accent: 0x111214, metal: 0.55, rough: 0.4 }, badge: { name: 'crest-mufc', x: 0.12, y: 1.6, size: 0.13 } } },
  { id: 'website-revamp', mark: 'V', hue: 268, spec: { model: 'mark-7-lite', paint: { base: 0x5b2ba3, accent: 0x9aa1ad } } },
  { id: 'v-bay', mark: 'VI', hue: 44, spec: { model: 'mark-50', tone: 0x2e2f35, paint: { base: 0x1d1e22, accent: 0xd3a339, metal: 0.7, rough: 0.35 } } },
  { id: 'others', mark: 'VII', hue: 218, spec: { model: 'mark-7', paint: { base: 0x1b3a78, accent: 0x8fa3bd, metal: 0.75, rough: 0.38 } } },
];
const HINT = 'Drag to turn';

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
  stage.tabIndex = 0;
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', 'The suit. Left and right arrow keys turn it.');
  const canvas = element('canvas', 'hall__canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const hint = element('p', 'hall__hint', HINT);
  stage.append(canvas, hint);

  const panel = element('div', 'hall__panel');
  const mark = element('p', 'hall__mark');
  const name = element('h3', 'hall__name');
  const line = element('p', 'hall__line');
  const spec = element('p', 'hall__spec');
  const figure = element('strong');
  const figureLabel = element('small');
  spec.append(figure, figureLabel);

  const open = element('a', 'hall__open');
  panel.append(mark, name, line, spec, open);

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
  return { root, stage, canvas, hint, mark, name, line, figure, figureLabel, open, suitButtons };
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
  // In the lab the Hall's panel is pinned while the visitor scrolls through a
  // hold as long as the row of bays: each stretch of it walks the camera one
  // bay on (css/hall.css, js/lab.js). The title stays above the hold and
  // scrolls away, so on a phone the pin has room for the tabs.
  let hold = null;
  if (document.documentElement.classList.contains('lab')) {
    hold = element('div', 'hall-hold');
    hold.dataset.labHold = '';
    const pin = element('div', 'hall-pin');
    title.after(hold);
    hold.append(pin);
    pin.append(ui.root);
    if (others) hold.after(others);
  } else {
    title.after(ui.root);
    if (others) ui.root.after(others);
  }
  // The Hall and the list replace the cards; the cards stay in the page for
  // search engines and come back if three.js fails to load.
  work.classList.add('work--hall');

  let hall = null;
  let lab = null; // the lab, once the suits stand in its bays
  let row = null;
  let current = 0;
  let visible = false;

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
    row?.focus(index);
    if (!hall || !hall.ready(suit.spec)) {
      ui.hint.textContent = `Loading Mark ${suit.mark}…`;
    }
    if (hall) {
      hall.setSuit(suit.spec, { instant: reduce }).then((shown) => {
        if (!shown) return;
        ui.hint.textContent = HINT;
        warmRest();
      }, fail);
    }
  };

  // Once a suit stands, the others are fetched and readied one at a time in
  // idle moments, so switching later is instant. Not on a slow or metered link:
  // there a suit is readied when its button is hovered or focused.
  let warming = false;
  const warmRest = () => {
    if (warming) return;
    warming = true;
    const link = navigator.connection;
    if (link && (link.saveData || /2g|3g/.test(link.effectiveType ?? ''))) return;
    // In the lab, every bay's suit stands too, nearest first.
    row?.warm(suits.map((_, i) => i).sort((a, b) => Math.abs(a - current) - Math.abs(b - current)));
    const order = suits.map((_, i) => suits[(current + 1 + i) % suits.length]);
    order.reduce((chain, next) => chain.then(() => hall?.prepare(next.spec)), Promise.resolve());
  };

  // The Hall can't stand without its scene or a suit's model: back to the cards.
  const fail = () => {
    hall?.stop();
    hall = null;
    row = null;
    lab = null;
    ui.root.remove();
    others?.remove();
    hold?.remove();
    work.classList.remove('work--hall');
  };
  // The lab gone (a lost GPU context) takes the bays with it: the cards return.
  if (hold) document.addEventListener('lab:failed', fail, { once: true });

  // A tab in the lab walks the camera to that suit's bay. The bays passed on
  // the way are not picked; the one headed for is, on arrival or soon after.
  let heading = -1;
  let headingTimer = 0;
  // A tab pressed before the suits have joined the lab waits for them.
  let asked = -1;
  const headFor = (index) => {
    heading = index;
    clearTimeout(headingTimer);
    headingTimer = setTimeout(() => {
      heading = -1;
    }, 1500);
    lab.goToBay(index);
  };

  ui.suitButtons.forEach((button) => {
    const index = Number(button.dataset.suit);
    const warm = () => hall?.prepare(suits[index].spec);
    button.addEventListener('click', () => {
      select(index);
      if (lab) headFor(index);
      else asked = index;
    });
    button.addEventListener('pointerenter', warm);
    button.addEventListener('focus', warm);
  });
  // Drag the suit round, all the way if you like; let go and it coasts to a
  // stop.
  const TURN_PER_PX = 0.012;
  let grab = null;
  ui.stage.addEventListener('pointerdown', (event) => {
    if (!hall || event.button !== 0) return;
    grab = { x: event.clientX, lx: event.clientX, t: performance.now(), moved: false };
    hall.state.held = true;
    hall.state.spin = 0;
    ui.stage.setPointerCapture(event.pointerId);
  });
  ui.stage.addEventListener('pointermove', (event) => {
    if (!grab || !hall) return;
    if (!grab.moved && Math.abs(event.clientX - grab.x) < 6) return;
    grab.moved = true;
    const dx = event.clientX - grab.lx;
    const now = performance.now();
    const turn = dx * TURN_PER_PX;
    hall.turn(turn);
    hall.state.spin = turn / Math.max(0.008, (now - grab.t) / 1000);
    grab.lx = event.clientX;
    grab.t = now;
  });
  const letGo = () => {
    if (!grab) return;
    // A pause before letting go leaves it still; otherwise it coasts.
    const paused = performance.now() - grab.t > 120;
    grab = null;
    if (!hall) return;
    hall.state.held = false;
    hall.state.spin = paused ? 0 : Math.max(-9, Math.min(9, hall.state.spin));
  };
  ui.stage.addEventListener('pointerup', letGo);
  ui.stage.addEventListener('pointercancel', letGo);
  // Arrow keys turn it for anyone without a pointer.
  ui.stage.addEventListener('keydown', (event) => {
    if (!hall || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    hall.turn((event.key === 'ArrowLeft' ? -1 : 1) * 0.3);
  });
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
    // In the lab the suit's place is its bay along the hold.
    if (index >= 0 && hold) {
      getLab().then((found) => {
        if (found && current === index) found.goToBay(index, { instant: true });
      });
    }
    return true;
  };

  select(Math.max(0, suits.findIndex((suit) => `#work-${suit.id}` === window.location.hash)));
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

  // In the lab the suits stand in its bays and its one canvas draws them;
  // scrolling through the hold picks the suit in the bay the camera reaches.
  const loadLab = (found) => import('./lab/suits.js').then(({ createSuitRow }) => {
    lab = found;
    row = createSuitRow(found.scene, suits.map((suit) => suit.spec), { hues: suits.map((suit) => suit.hue) });
    hall = row.stage;
    // The whole row stands from the start, so the bays are never seen empty
    // as the camera comes down the gallery. Not on a slow or metered link.
    const link = navigator.connection;
    if (!(link && (link.saveData || /2g|3g/.test(link.effectiveType ?? '')))) row.warm(suits.map((_, i) => i));
    found.onBay((index) => {
      if (heading >= 0 && index !== heading) return;
      heading = -1;
      if (index !== current) select(index);
    });
    if (asked >= 0) {
      select(asked);
      headFor(asked);
      asked = -1;
      return;
    }
    const standing = Number(document.documentElement.dataset.bay ?? -1);
    select(standing >= 0 ? standing : current);
  });

  const load = () => {
    getLab().then((found) => (found ? loadLab(found) : loadHall())).catch(fail);
  };

  const loadHall = () => {
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

  // In the lab the suits stand in the bays seen from the door, so they load
  // as soon as the site wakes. Elsewhere, fetch three.js and build the first
  // core only once Work is near.
  whenActive(() => {
    if (document.documentElement.classList.contains('lab')) {
      load();
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    const near = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      load();
    }, { rootMargin: '700px' });
    near.observe(work);
  });
}
