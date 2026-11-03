// Checks the portfolio against its spec. Each check gets the window of the
// page loaded in an iframe of a set size, and the iframe itself, and returns
// a list of { name, pass, detail }. run.js decides which checks run where.

const WIDE = 1024;
// The walk's order: the door, About, the suits, the trophy shelf, the bench, the office.
const SECTIONS = ['top', 'about', 'work', 'experience', 'toolkit', 'contact'];
const CARDS = ['website-revamp', 'parallel-match', 'assistant-bot', 'trading-agent', 'research-agent', 'watchpartyyy', 'v-bay', 'others'];
// The drawing-set palette (paper, desk, ink, accent) and the pastels before it.
const OLD_COLOURS = /#(fafaf7|e6e5e0|111214|4f5156|6c6e72|2541e6|ffb7d5|ffd98e|a9ddff|b9f2df|ff8fb1|ffe446|cdf5e6|ff9fb6|3a4a86|9b3158)\b|rgba\(17,\s*18,\s*20|rgba\(37,\s*65,\s*230/i;

const result = (name, pass, detail = '') => ({ name, pass: Boolean(pass), detail: String(detail) });
const wait = (ms) => new Promise((done) => { setTimeout(done, ms); });
const shown = (el) => {
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
};
const until = async (test, ms) => {
  for (let t = 0; t < ms && !test(); t += 100) await wait(100);
  return test();
};
// Whether this frame can run the lab: WebGL2 and no reduced motion. The test
// context is released at once so it never counts against the browser's limit.
const labCapable = (win) => {
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const gl = win.document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
};

// Six sections in story order, one h1, and headings that never skip a level.
export function structure(win) {
  const ids = [...win.document.querySelectorAll('main > section')].map((section) => section.id).join(',');
  return [result('six sections in story order', ids === SECTIONS.join(','), ids)];
}

export function headings(win) {
  const levels = [...win.document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
  const skips = levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1);
  return [
    result('one h1', levels.filter((level) => level === 1).length === 1 && levels[0] === 1, levels.join('')),
    result('headings never skip a level', skips.length === 0, levels.join('')),
  ];
}

// The drawing set and the rounds before it are gone.
export function removed(win) {
  const doc = win.document;
  const gone = [
    '.sheet', '.sheet__label', '.sheet__next', '.ticks', '.bar__index', '[data-where-n]', '.titleblock',
    '.mark', '.mark__stroke', '.ambient', '.project__row', '.project__panel', '.project__icons', '.others__icons',
    '.keyboard', '.marquee', '[data-kinetic]', '[data-shader]', '[data-tabs]', '.chip', '.credentials',
    '[data-wave]', '.wave', '.tag img',
  ];
  const files = ['sheets.css', 'keyboard.css', 'marquee.css', 'hero.css', 'sections.css', 'contact.css', 'motion.css'];
  const hrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'));
  const scripts = win.performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => /\/(lean|work|wave)\.js/.test(name));
  const blurred = [...doc.querySelectorAll('body *')].filter((el) => {
    const style = win.getComputedStyle(el);
    return (style.backdropFilter && style.backdropFilter !== 'none') || (style.webkitBackdropFilter && style.webkitBackdropFilter !== 'none');
  });
  const fonts = [...doc.querySelectorAll('link[rel="stylesheet"]')].some((link) => /switzer|Fragment\+Mono/i.test(link.href));
  return [
    ...gone.map((selector) => result(`removed: ${selector}`, !doc.querySelector(selector))),
    result('removed: old stylesheets', !hrefs.some((href) => files.some((file) => href.endsWith(file))), hrefs.join(' ')),
    result('removed: lean.js, work.js and wave.js', scripts.length === 0, scripts.join(' ')),
    result('removed: Switzer and Fragment Mono', !fonts),
    result('no backdrop-filter', blurred.length === 0, `${blurred.length} elements`),
  ];
}

// Measured against the visible width (no scrollbar), so a few px of sideways overflow still counts.
export function overflow(win) {
  const root = win.document.documentElement;
  return [result('no horizontal scroll', root.scrollWidth <= root.clientWidth, `scroll ${root.scrollWidth} vs client ${root.clientWidth}`)];
}

export function fonts(win) {
  const loaded = [...win.document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/"/g, ''));
  return ['Schibsted Grotesk', 'Azeret Mono', 'Bodoni Moda', 'Satoshi']
    .map((family) => result(`${family} loaded`, loaded.includes(family), [...new Set(loaded)].join(', ')));
}

// Below 1024px, every control a thumb needs is at least 44 × 44. The diagram
// pause button is 32px drawn with a 48px hit area (a pseudo-element), so
// it is measured by that area.
export function targets(win) {
  if (win.innerWidth >= WIDE) return [];
  const selector = '.nav a, .nav button, .menu a, .pill, .work__card, .hall__suit, .hall__pass, .others__row, [data-copy], .contact__address, .back, .next, .footer a';
  // Layout sizes, so a rise animation's transform mid-flight cannot round a
  // 44px pill down to 43.99.
  const small = [...win.document.querySelectorAll(selector)].filter(shown).filter((el) => el.offsetWidth < 44 || el.offsetHeight < 44);
  const toggles = [...win.document.querySelectorAll('.reel__toggle')].filter(shown).filter((el) => {
    const after = win.getComputedStyle(el, '::after');
    const grow = -parseFloat(after.top) * 2;
    const box = el.getBoundingClientRect();
    return box.width + grow < 44 || box.height + grow < 44;
  });
  return [result('tap targets at least 44px', small.length + toggles.length === 0,
    [...small, ...toggles].map((el) => {
      return `${el.textContent.trim().slice(0, 24) || el.className} ${el.offsetWidth}×${el.offsetHeight}`;
    }).join(' | '))];
}

// No paper, desk or pastel colour survives in a stylesheet or a diagram,
// and the page is near-black (tinted by the reactor's hue).
export function palette(win) {
  const doc = win.document;
  let css = '';
  [...doc.styleSheets].forEach((sheet) => {
    try {
      if (sheet.href && !sheet.href.startsWith(win.location.origin)) return;
      css += [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
    } catch {
      // A cross-origin sheet (the fonts) cannot be read; it holds no colours.
    }
  });
  const stale = [...doc.querySelectorAll('svg [fill], svg [stroke]')]
    .filter((el) => OLD_COLOURS.test(`${el.getAttribute('fill')} ${el.getAttribute('stroke')}`));
  const match = css.match(OLD_COLOURS);
  return [
    result('stylesheets use only the new palette', !match, match?.[0] ?? ''),
    result('diagrams use only the new palette', stale.length === 0, `${stale.length} old colours`),
    result('page background is near-black', (() => {
      const [r, g, b] = win.getComputedStyle(doc.body).backgroundColor.match(/[\d.]+/g).map(Number);
      return Math.max(r, g, b) <= 16;
    })(), win.getComputedStyle(doc.body).backgroundColor),
  ];
}

// Every text grey passes 4.5:1 on every surface it sits on, computed from
// the tokens: the four dark-band greys on black, the two band greys and the
// head of a card; the inverted Contact band's greys on off-white, and its
// dark pills; and the focus ring at 3:1 on both.
export function contrast(win) {
  const doc = win.document;
  const rgb = (value) => {
    const probe = doc.createElement('i');
    probe.style.color = value;
    doc.body.append(probe);
    const parts = win.getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    probe.remove();
    return parts;
  };
  const luminance = ([r, g, b]) => [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const tokens = (el) => {
    const style = win.getComputedStyle(el);
    return (name) => style.getPropertyValue(name).trim();
  };
  const out = [];
  const pair = (label, fg, bg, min) => {
    const value = ratio(fg, bg);
    out.push(result(`${label} at least ${min}:1`, value >= min, `${fg} on ${bg}: ${value.toFixed(2)}:1`));
  };

  const dark = tokens(doc.documentElement);
  const surfaces = ['--bg', '--grey-900', '--grey-850', '--card-top'];
  ['--text', '--text-2', '--muted', '--dim'].forEach((fg) => {
    surfaces.forEach((bg) => pair(`${fg} on ${bg}`, dark(fg), dark(bg), 4.5));
  });
  pair('focus ring on --bg', dark('--focus'), dark('--bg'), 3);
  pair('focus ring on --card-top', dark('--focus'), dark('--card-top'), 3);
  pair('solid pill text', dark('--bg'), dark('--text'), 4.5);

  const band = doc.querySelector('.band--light');
  if (band) {
    const light = tokens(band);
    ['--text', '--text-2', '--muted', '--dim'].forEach((fg) => pair(`light band ${fg}`, light(fg), light('--band'), 4.5));
    pair('light band solid pill text', light('--bg'), light('--text'), 4.5);
    pair('light band focus ring', light('--focus'), light('--band'), 3);
    const shownBg = win.getComputedStyle(band).borderImageSource;
    const painted = (shownBg.match(/rgba?\([^)]*\)/g) || []).map((c) => c.match(/[\d.]+/g).slice(0, 3).map(Number));
    if (doc.documentElement.classList.contains('lab')) {
      // In the lab Contact is the office's warm screen: its panel is painted
      // in the band's own (dark) --band.
      const own = rgb(light('--band')).join(',');
      out.push(result('Contact is the office screen, painted in its own --band', band.id === 'contact' && painted.some((c) => c.join(',') === own), shownBg.slice(0, 80)));
    } else {
      const pale = painted.some((c) => c.every((v) => v >= 230));
      out.push(result('Contact is the light band', band.id === 'contact' && pale, shownBg.slice(0, 60)));
    }
  }
  return out;
}

// Visitor-facing text has no em dashes: the body, the title and the meta.
export function emDash(win) {
  const doc = win.document;
  const meta = [...doc.querySelectorAll('meta[content]')].map((m) => m.content).join(' ');
  const text = `${doc.title} ${meta} ${doc.body.textContent} ${[...doc.querySelectorAll('[aria-label], [alt]')].map((el) => el.getAttribute('aria-label') ?? el.getAttribute('alt')).join(' ')}`;
  const found = text.match(/.{0,24}—.{0,24}/);
  return [result('no em dashes', !found, found?.[0] ?? '')];
}

// About holds Evan's photo in a card; the cartoon is gone.
export function aboutPhoto(win) {
  const img = win.document.querySelector('#about .card img');
  return [
    result('About shows the photo, with alt text', img && /evan(-600)?\.jpg/.test(img.getAttribute('src')) && img.srcset.includes('evan.jpg 1000w') && img.alt.length > 20, img?.alt ?? 'missing'),
  ];
}

// The cards meet "Selected work" at its baseline at most: they may cover the
// descender zone, never the letters. A zero-size inline-block at the end of
// the title sits on its (last line's) baseline.
export function workTitle(win) {
  const title = win.document.getElementById('work-title');
  // With the Hall up, it stands in for the cards.
  const grid = win.document.querySelector('#work.work--hall .hall') ?? win.document.querySelector('#work .work__grid');
  if (!title || !grid) return [result('Selected work title readable', false, 'missing')];
  const probe = win.document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  title.append(probe);
  const baseline = probe.getBoundingClientRect().top;
  probe.remove();
  const top = grid.getBoundingClientRect().top;
  return [result('cards sit at or below the title baseline', top >= baseline - 0.5, `cards ${top.toFixed(1)} vs baseline ${baseline.toFixed(1)}`)];
}

// Six cards, each one link to a page that exists, named by its title, and
// keeping its #work-… id so old links land on it.
export async function workCards(win) {
  const doc = win.document;
  const cards = [...doc.querySelectorAll('#work .work__card')];
  const ids = cards.map((card) => card.id.replace('work-', '')).join(',');
  const out = [
    result('eight work cards, in order', ids === CARDS.join(','), ids),
    result('cards hold no nested links or buttons', cards.every((card) => !card.querySelector('a, button'))),
    result('cards hold a counting figure', cards.every((card) => card.querySelector('.work__figure [data-count]'))),
  ];
  const named = cards.every((card) => {
    const title = card.querySelector('h3')?.textContent.trim();
    const label = (card.getAttribute('aria-labelledby') ?? '').split(/\s+/).map((id) => doc.getElementById(id)?.textContent.trim()).join(' ');
    return title && label.startsWith(title);
  });
  out.push(result('each card is named by its title', named));
  const codes = await Promise.all(cards.map((card) => win.fetch(card.href, { cache: 'no-store' }).then((response) => response.status, () => 0)));
  out.push(result('each card opens a page that exists', codes.every((code) => code === 200), codes.join(' ')));
  return out;
}

// The project pages and the case study: the way back and the next project,
// which runs through all eight and back to the start.
export async function projectPage(win) {
  const doc = win.document;
  const back = doc.querySelector('main .back');
  const next = doc.querySelector('main .next');
  const code = next ? await win.fetch(next.href, { cache: 'no-store' }).then((response) => response.status, () => 0) : 0;
  return [
    result('page: link back to all work', back?.getAttribute('href') === '/#work'),
    result('page: next project exists', code === 200, next?.getAttribute('href')),
    result('page: big figures or none', [...doc.querySelectorAll('.stats dd')].every((dd) => dd.querySelector('[data-count]'))),
  ];
}

// Diagram notes are large enough to read: the smallest renders at least 9px
// from 1280px wide, 8px from 1024px and 7px below.
export function figureText(win) {
  const doc = win.document;
  const min = win.innerWidth >= 1280 ? 9 : win.innerWidth >= WIDE ? 8 : 7;
  const notes = [...doc.querySelectorAll('.reel__text--note')].filter((text) => text.getBBox().width > 0);
  if (!notes.length) return [];
  const sizes = notes.map((text) => parseFloat(win.getComputedStyle(text).fontSize) * text.ownerSVGElement.getScreenCTM().a);
  const smallest = Math.min(...sizes);
  return [result(`diagram notes at least ${min}px`, smallest >= min - 0.05, `${smallest.toFixed(1)}px`)];
}

// Experience carries the honours after the roles, each tier under its own
// heading (awards, the scholarship, certificates, schooling), and Toolkit is
// only the tools: no tabs.
export function honours(win) {
  const doc = win.document;
  const shelf = doc.querySelector('#experience [data-shelf]');
  const tiers = [...(shelf?.querySelectorAll('.honours__tier') ?? [])];
  const names = tiers.map((h) => h.textContent.trim()).join(',');
  const ids = tiers.map((h) => h.closest('[id]')?.id).join(',');
  const rows = tiers.map((h) => h.nextElementSibling?.querySelectorAll(':scope > div').length ?? 0).join(',');
  return [
    result('honours: four tiers in Experience, in order', names === 'Awards,Scholarship,Certifications,Education', names || 'none'),
    result('honours: each tier keeps its old link', ids === 'recognition,scholarship,certifications,education', ids),
    result('honours: 4 awards, 1 scholarship, 2 certificates, 3 schools', rows === '4,1,2,3', rows),
    result('honours: Toolkit has no tabs', !doc.querySelector('#toolkit [role="tablist"], #toolkit [role="tab"], [data-kit]')),
  ];
}

// An old link to #education or #certifications lands on that tier, now in
// Experience, on screen.
export async function honoursLink(win) {
  await wait(800);
  let last = -1;
  for (let i = 0; i < 40 && win.scrollY !== last; i += 1) {
    last = win.scrollY;
    await wait(150);
  }
  const id = win.location.hash.slice(1);
  const tier = win.document.getElementById(id);
  const top = tier?.getBoundingClientRect().top ?? -1;
  return [result(`#${id} lands on its tier in Experience`, Boolean(tier?.closest('#experience')) && shown(tier) && top >= 0 && top < win.innerHeight, `top ${Math.round(top)}`)];
}

// An old project link such as #work-trading-agent lands on that card. With
// the Hall up it picks that suit and lands on the Hall, or on the project's
// Other projects row if it has no suit.
export async function deepLink(win) {
  // Give the browser time to start the jump before waiting for it to settle.
  await wait(800);
  let last = -1;
  for (let i = 0; i < 40 && win.scrollY !== last; i += 1) {
    last = win.scrollY;
    await wait(150);
  }
  const doc = win.document;
  const id = win.location.hash.slice(1);
  const key = id.replace(/^work-/, '');
  const card = doc.getElementById(id);
  if (!doc.querySelector('#work.work--hall')) {
    const top = card?.getBoundingClientRect().top ?? -1;
    return [result(`#${id} lands on its card`, card?.matches('.work__card') && top >= 0 && top < win.innerHeight / 2, `top ${Math.round(top)}`)];
  }
  const button = doc.querySelector(`.hall__suit[data-id="${key}"]`);
  const target = button ? doc.querySelector('.hall') : doc.querySelector(`.others__row[data-for="${key}"]`);
  const top = target?.getBoundingClientRect().top ?? -1;
  const picked = !button || button.getAttribute('aria-pressed') === 'true';
  return [result(`#${id} lands on its ${button ? 'suit' : 'row'}`, Boolean(target) && picked && top >= 0 && top < win.innerHeight / 2, `top ${Math.round(top)}`)];
}

// The nav marks the section on screen.
export async function navIndex(win) {
  const doc = win.document;
  doc.getElementById('experience').scrollIntoView({ behavior: 'instant' });
  await wait(300);
  const current = [...doc.querySelectorAll('.nav__links a[aria-current="true"], .menu__links a[aria-current="true"]')].map((a) => a.getAttribute('href'));
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(400); // an observer turn, even on a busy machine
  const top = doc.querySelectorAll('[aria-current="true"]').length;
  return [
    result('nav marks the section on screen', current.length === 2 && current.every((href) => href === '#experience'), current.join(' ')),
    result('nav marks nothing in the hero', top === 0, `${top} marked`),
  ];
}

// The page scrolls to the hash smoothly, so wait for it to stop first.
export async function hashSection(win) {
  let last = -1;
  for (let i = 0; i < 40 && win.scrollY !== last; i += 1) {
    last = win.scrollY;
    await wait(150);
  }
  const current = win.document.querySelector('.nav__links a[aria-current="true"]')?.getAttribute('href');
  return [result('arriving at #toolkit marks Toolkit', current === '#toolkit', current)];
}

// The scroll progress line is decorative and follows the page.
export async function progress(win) {
  const line = win.document.querySelector('[data-progress]');
  win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' });
  await wait(150);
  const end = line?.style.transform ?? '';
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [result('progress line follows the scroll', line?.getAttribute('aria-hidden') === 'true' && parseFloat(end.replace('scaleX(', '')) > 0.999, end)];
}

export function menu(win) {
  const doc = win.document;
  const button = doc.querySelector('[data-menu-button]');
  const panel = doc.getElementById('menu');
  if (win.innerWidth >= WIDE) return [result('menu button hidden on wide screens', button && !shown(button))];
  const out = [
    result('menu button shown', button && shown(button)),
    result('menu starts closed', panel?.hidden),
  ];
  button.click();
  const main = doc.getElementById('main');
  const footer = doc.querySelector('body > .footer');
  out.push(result('menu opens over an inert page and footer', !panel.hidden && shown(panel) && button.getAttribute('aria-expanded') === 'true' && main.inert === true && footer?.inert === true, `inert ${main.inert} ${footer?.inert}`));
  panel.querySelector('a').focus();
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  out.push(result('Escape closes it and returns focus', panel.hidden && button.getAttribute('aria-expanded') === 'false' && main.inert === false && footer?.inert === false && doc.activeElement === button, `inert ${main.inert}`));
  button.blur();
  return out;
}

// In an unfocused iframe the clipboard refuses, so either outcome passes. The
// menu check leaves its button focused, and a focused frame leaves the
// clipboard waiting for a real click, so hand focus back to the page first.
export async function copy(win, frame) {
  const button = win.document.querySelector('[data-copy]');
  if (!button || button.hidden) return [result('copy button shown', false, 'missing or hidden')];
  frame.blur();
  button.click();
  await wait(150);
  return [result('copy button responds', /Copied|Selected/.test(button.textContent), button.textContent)];
}

// The masked title reveal splits each title into word spans, but the text a
// screen reader gets must read exactly as written, nothing in a heading may
// be aria-hidden, and once a title has been seen every word is in place.
const TITLES = {
  'hero-title': 'Most AI demos never get tested. Mine have 460+ tests.',
  'about-title': 'About me',
  'experience-title': 'My experience',
  'work-title': 'Selected work',
  'toolkit-title': 'Toolkit',
  'contact-title': 'Let’s talk',
};

export async function titles(win) {
  const doc = win.document;
  const heads = [...doc.querySelectorAll('.hero__title, .title, .project__title')];
  const read = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const out = [
    result('titles: nothing inside a title is aria-hidden', heads.every((head) => !head.querySelector('[aria-hidden]'))),
  ];
  const wrong = heads.filter((head) => TITLES[head.id] && read(head) !== TITLES[head.id]);
  if (heads.some((head) => TITLES[head.id])) {
    out.push(result('titles: text reads exactly as written', wrong.length === 0, wrong.map(read).join(' | ')));
  } else {
    out.push(result('titles: text has no doubled or missing spaces', heads.every((head) => !/\s{2}|\S /.test(head.textContent.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ')) && read(head).length > 2), heads.map(read).join(' | ')));
  }
  for (const head of heads) {
    head.scrollIntoView({ behavior: 'instant', block: 'center' });
    await wait(250); // long enough for an IntersectionObserver turn in every engine
  }
  await wait(1500);
  const hidden = [...doc.querySelectorAll('.word__in')].filter((word) => {
    const matrix = new win.DOMMatrixReadOnly(win.getComputedStyle(word).transform);
    return Math.abs(matrix.m42) > 0.5 || Math.abs(matrix.m21) > 0.01;
  });
  out.push(result('titles: every word ends in place once seen', hidden.length === 0, `${hidden.length} still moving or hidden`));
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(50);
  return out;
}

// The spotlight and the magnetic pills only exist for a fine pointer that
// can hover; on touch screens no listener is attached.
export function pointerOnly(win) {
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const marked = win.document.querySelectorAll('[data-pointer]').length;
  return [result('spotlight and magnets only with a fine pointer', fine ? marked > 0 : marked === 0, `fine ${fine}, ${marked} marked`)];
}

// The Experience timeline: a fill line that is whole once the section has
// scrolled past, and a node per role that lights as the role is seen.
export async function timeline(win) {
  const doc = win.document;
  const line = doc.querySelector('[data-timeline]');
  const fill = line?.querySelector('.timeline__fill');
  if (!fill) return [result('timeline present', false)];
  // Scroll down through it as a reader would, then past it.
  const top = win.scrollY + line.getBoundingClientRect().top;
  const height = line.getBoundingClientRect().height;
  for (let y = top - win.innerHeight; y <= top + height; y += win.innerHeight / 3) {
    win.scrollTo({ top: y, behavior: 'instant' });
    await wait(60);
  }
  await wait(300);
  const matrix = new win.DOMMatrixReadOnly(win.getComputedStyle(fill).transform);
  const lit = [...line.querySelectorAll('.role')].every((role) => role.classList.contains('is-visible'));
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(50);
  return [
    result('timeline is whole once Experience has scrolled past', matrix.d > 0.99, `scaleY ${matrix.d.toFixed(3)}`),
    result('timeline nodes light as each role is seen', lit),
  ];
}

// About's proof strip: four figures that count up, each with its label.
export function proof(win) {
  const items = [...win.document.querySelectorAll('#about .proof > div')];
  return [result('About proof strip: four counted figures with labels', items.length === 4 && items.every((item) => item.querySelector('dd [data-count]') && item.querySelector('dt')?.textContent.trim()))];
}

// The hero's arc reactor: its still is decorative, the reactor is one
// labelled button, and the colour cells are gone.
export function reactor(win) {
  const doc = win.document;
  const root = doc.querySelector('[data-reactor]');
  if (!root) return [result('reactor present', false)];
  const poster = root.querySelector('.reactor__poster');
  const hit = root.querySelector('[data-reactor-hit]');
  return [
    result('reactor still is decorative', poster && poster.getAttribute('alt') === '' && poster.complete && poster.naturalWidth > 0),
    // The live canvas, once there, must paint above the still.
    result('live reactor paints above the still', !root.querySelector('canvas') || (parseInt(win.getComputedStyle(root.querySelector('canvas')).zIndex, 10) || 0) > (parseInt(win.getComputedStyle(poster).zIndex, 10) || 0), root.querySelector('canvas') ? win.getComputedStyle(root.querySelector('canvas')).zIndex : 'no canvas'),
    result('reactor is a labelled button', hit?.tagName === 'BUTTON' && /hold/i.test(hit.getAttribute('aria-label') || '')),
    result('no colour cells', !doc.querySelector('[data-hue], .cells')),
  ];
}

// On wide screens the credentials hang off the reactor as callouts: each
// sits inside the hero, clear of the name and of the others.
export function callouts(win) {
  const doc = win.document;
  const hero = doc.querySelector('.hero');
  const items = [...doc.querySelectorAll('[data-callouts] li')];
  const wide = win.innerWidth >= WIDE;
  if (!wide) return [result('credentials are a plain list below 1024', !hero.classList.contains('hero--hud') && items.every((item) => win.getComputedStyle(item).position === 'static'))];
  const box = hero.getBoundingClientRect();
  const words = [...doc.querySelectorAll('.hero__name span')].map((span) => span.getBoundingClientRect());
  const rects = items.map((item) => item.getBoundingClientRect());
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const inside = rects.every((r) => r.left >= box.left && r.right <= box.right && r.top >= box.top);
  const clear = rects.every((r, i) => !words.some((w) => hit(r, w)) && !rects.some((o, j) => j !== i && hit(r, o)));
  return [
    result('credentials hang off the reactor on wide screens', hero.classList.contains('hero--hud') && doc.querySelectorAll('[data-lines] path').length === items.length),
    result('callouts sit inside the hero', inside, rects.map((r) => `${Math.round(r.left)}-${Math.round(r.right)}`).join(' ')),
    result('callouts clear of the name and each other', clear),
  ];
}

// The gate: a first visit opens dark, with only the reactor and the way
// in; the rest of the page is hidden and out of reach. Activate wakes it,
// and the session remembers that.
export async function gate(win) {
  const doc = win.document;
  const root = doc.documentElement;
  const button = doc.querySelector('[data-gate-activate]');
  const mic = doc.querySelector('[data-gate-mic]');
  const hidden = (el) => win.getComputedStyle(el).visibility === 'hidden';
  const voice = Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  const out = [
    result('gate: a first visit opens gated', root.classList.contains('gated')),
    result('gate: Activate shown and at least 44px', button && shown(button) && button.offsetHeight >= 44, button ? `${button.offsetWidth}×${button.offsetHeight}` : 'missing'),
    result('gate: the mic shows only where speech recognition exists', mic && mic.hidden === !voice, `voice ${voice}, hidden ${mic?.hidden}`),
    result('gate: nav and sections hidden and inert', hidden(doc.querySelector('.nav')) && doc.querySelector('.nav').inert
      && [...doc.querySelectorAll('main > section:not(.hero)')].every((section) => hidden(section) && section.inert)),
    result('gate: the headline waits hidden', hidden(doc.querySelector('.hero__title'))),
  ];
  button?.click();
  await wait(1200);
  let stored = null;
  try {
    stored = win.sessionStorage.getItem('portfolio-on');
  } catch {
    stored = 'blocked';
  }
  out.push(
    result('gate: Activate wakes the site', !root.classList.contains('gated') && !doc.querySelector('.nav').inert && !hidden(doc.querySelector('.hero__title'))),
    result('gate: the session remembers it', stored === '1' || stored === 'blocked', String(stored)),
  );
  return out;
}

// A recruiter with six seconds is never stuck: the resume and email are
// reachable behind the gate, and the site wakes by itself soon after load.
export async function gateAuto(win) {
  const doc = win.document;
  const root = doc.documentElement;
  const reachable = (el) => {
    if (!el || el.closest('[inert]') || win.getComputedStyle(el).visibility === 'hidden' || !shown(el)) return false;
    const box = el.getBoundingClientRect();
    const top = doc.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return Boolean(top && (top === el || el.contains(top)));
  };
  const out = [
    result('gate: still gated just after load', root.classList.contains('gated')),
    result('gate: resume reachable while gated', reachable(doc.querySelector('.hero__actions a[href$=".pdf"]'))),
    result('gate: email reachable while gated', reachable(doc.querySelector('.hero__actions [data-contact-link]'))),
  ];
  await wait(2600);
  out.push(result('gate: wakes by itself within about 3 seconds', !root.classList.contains('gated')));
  return out;
}

// Scrolling wakes it at once.
export async function gateScroll(win) {
  const doc = win.document;
  const was = doc.documentElement.classList.contains('gated');
  doc.dispatchEvent(new win.WheelEvent('wheel', { deltaY: 120, bubbles: true }));
  await wait(1200);
  return [result('gate: scrolling wakes the site', was && !doc.documentElement.classList.contains('gated'))];
}

// Typing the wake word works too.
export async function gateTyped(win) {
  const doc = win.document;
  const was = doc.documentElement.classList.contains('gated');
  [...'xego'].forEach((key) => doc.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true })));
  await wait(1200);
  return [result('gate: typing “ego” wakes the site', was && !doc.documentElement.classList.contains('gated'))];
}

// Search engines can find every page: robots.txt points at a sitemap that
// lists the main page and every project page by its canonical address, and
// the main page says who it is about in JSON-LD.
export async function discovery(win) {
  const doc = win.document;
  const home = doc.querySelector('link[rel="canonical"]')?.href ?? '';
  const get = async (path) => {
    try {
      const response = await win.fetch(path, { cache: 'no-store' });
      return response.ok ? await response.text() : '';
    } catch {
      return '';
    }
  };
  const robots = await get('/robots.txt');
  const sitemap = await get('/sitemap.xml');
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const pages = [...doc.querySelectorAll('.work__grid a.work__card')]
    .map((a) => new URL(a.getAttribute('href'), home).href.replace(/\.html$/, ''));
  const expected = [home, ...pages];
  const missing = expected.filter((url) => !listed.includes(url));
  let person = null;
  try {
    person = JSON.parse(doc.querySelector('script[type="application/ld+json"]')?.textContent ?? 'null');
  } catch {
    person = null;
  }
  const profiles = [...doc.querySelectorAll('a[href*="github.com/"], a[href*="linkedin.com/in/"]')].map((a) => a.href);
  const sameAs = person?.sameAs ?? [];
  return [
    result('robots.txt allows crawling and names the sitemap', robots.includes(`Sitemap: ${home}sitemap.xml`) && !/^Disallow:\s*\/\s*$/m.test(robots)),
    result('sitemap lists the main page and every project page', listed.length === expected.length && missing.length === 0, missing.join(' ') || `${listed.length} urls`),
    result('JSON-LD names the person behind the site', person?.['@type'] === 'Person' && person?.name === 'Evan Yap' && person?.url === home),
    result('JSON-LD links the same profiles as the page', profiles.length > 0 && profiles.every((href) => sameAs.includes(href)), sameAs.join(' ')),
  ];
}

// The lab: one fixed canvas behind the page, where the frame can run it, and
// none where it cannot.
export async function lab(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) {
    return [result('no lab without WebGL2 or with reduced motion', !root.classList.contains('lab') && !doc.querySelector('.lab__canvas'))];
  }
  const ready = await until(() => root.classList.contains('lab-ready'), 6000);
  const canvases = doc.querySelectorAll('canvas.lab__canvas');
  const canvas = canvases[0];
  const style = canvas && win.getComputedStyle(canvas);
  const box = canvas?.getBoundingClientRect();
  // The visible width. Headless Chrome reports root.clientWidth without the
  // scrollbar it still lays out, so the visual viewport is the honest number.
  const vw = Math.round(win.visualViewport?.width ?? root.clientWidth);
  const vh = root.clientHeight;
  return [
    result('lab mode is on', root.classList.contains('lab')),
    result('one lab canvas', canvases.length === 1, `${canvases.length}`),
    result('lab canvas is fixed, hidden from readers and lets clicks through',
      style?.position === 'fixed' && canvas.getAttribute('aria-hidden') === 'true' && style.pointerEvents === 'none',
      style ? `${style.position} ${canvas.getAttribute('aria-hidden')} ${style.pointerEvents}` : 'missing'),
    result('lab canvas fills the screen', box && Math.abs(box.width - vw) <= 1 && Math.abs(box.height - vh) <= 1,
      box ? `${Math.round(box.width)}×${Math.round(box.height)} of ${vw}×${vh}` : 'missing'),
    result('lab is ready within 6 s', ready),
  ];
}

// Scrolling walks the camera: each section is a stop, and the end of the page
// is the office even when the page is too short to bring Contact to the top.
export async function labRail(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('rail: no lab in this frame', !root.classList.contains('lab'))];
  await until(() => root.classList.contains('lab-ready'), 6000);
  const seen = [];
  for (const id of SECTIONS) {
    doc.getElementById(id).scrollIntoView({ behavior: 'instant' });
    await wait(300);
    seen.push(`${id}:${root.dataset.stop}`);
  }
  const missed = seen.filter((pair) => { const [want, got] = pair.split(':'); return want !== got; });
  win.scrollTo({ top: root.scrollHeight, behavior: 'instant' });
  await wait(300);
  const end = root.dataset.stop;
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('the camera stops at each section', missed.length === 0, seen.join(' ')),
    result('the end of the page is the office', end === 'contact', end),
  ];
}

// The arc reactor is the lab's door: a first visit finds it shut, and waking
// the site opens it.
export async function gateDoor(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('door: no lab in this frame', !root.classList.contains('lab'))];
  await until(() => root.classList.contains('lab-ready') || !root.classList.contains('gated'), 6000);
  const shut = root.classList.contains('gated') ? root.dataset.door : 'woke before the lab was ready';
  doc.querySelector('[data-gate-activate]')?.click();
  await wait(2200);
  return [
    result('door: shut while the site is gated', shut === 'closed', String(shut)),
    result('door: Activate opens it', root.dataset.door === 'open' && root.classList.contains('door-open'), `${root.dataset.door} ${root.classList.contains('door-open')}`),
  ];
}

// A link into the page, or a visitor already let in this session, finds the
// door already open at the first frame, with the camera at the linked stop.
export async function labDoor(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('door: no lab in this frame', !root.classList.contains('lab'))];
  await until(() => root.classList.contains('lab-ready'), 6000);
  const first = `${root.dataset.door} ${root.dataset.stop}`;
  await until(() => root.dataset.stop === 'toolkit', 1000);
  return [
    result('door: already open at the first frame', first.startsWith('open '), first),
    result('door: the camera is at the linked stop', root.dataset.stop === 'toolkit', String(root.dataset.stop)),
  ];
}

// A phone's address bar changing the height mid-scroll keeps the camera where it is.
export async function labResize(win, frame) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('resize: no lab in this frame', !root.classList.contains('lab'))];
  await until(() => root.classList.contains('lab-ready'), 6000);
  doc.getElementById('work').scrollIntoView({ behavior: 'instant' });
  await wait(300);
  const before = root.dataset.stop;
  frame.height = '760';
  await wait(400);
  const after = root.dataset.stop;
  return [result('a shorter screen keeps the camera at Work', before === 'work' && after === 'work', `${before} → ${after}`)];
}

// A lost WebGL context (a backgrounded phone tab, a GPU reset) drops to the
// plain page with its words readable, never a black screen.
export async function labLost(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('lost: no lab in this frame', !root.classList.contains('lab'))];
  await until(() => root.classList.contains('lab-ready'), 6000);
  const canvas = doc.querySelector('.lab__canvas');
  if (!canvas) return [result('a lost context drops to the plain page', false, 'no lab canvas to lose')];
  canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
  const plain = await until(() => !root.classList.contains('lab') && !doc.querySelector('.lab__canvas'), 1500);
  const text = doc.querySelector('#about .about__text');
  const style = text && win.getComputedStyle(text);
  return [
    result('a lost context drops to the plain page', plain, `${root.className}`),
    result('About reads after the drop', text && shown(text) && style.visibility !== 'hidden' && style.display !== 'none'),
  ];
}

// In the lab the suits stand in a row of bays: a tab walks the camera to its
// bay, the panel names that suit, and the Hall stays on screen (sticky).
export async function labBays(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('bays: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready') && doc.querySelector('.hall__suit[data-suit="4"]'), 6000);
  doc.getElementById('work').scrollIntoView({ behavior: 'instant' });
  await wait(300);
  const button = doc.querySelector('.hall__suit[data-suit="4"]');
  button?.click();
  await wait(1200);
  const card = doc.querySelector(`#work-${button?.dataset.id} .work__name`);
  const name = doc.querySelector('.hall__name')?.textContent.trim();
  const top = doc.querySelector('.hall')?.getBoundingClientRect().top ?? -1;
  const bay = root.dataset.bay;
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('bays: the tab is pressed', button?.getAttribute('aria-pressed') === 'true', String(button?.getAttribute('aria-pressed'))),
    result('bays: the panel names that suit', Boolean(name) && name === card?.textContent.trim(), `${name} vs ${card?.textContent.trim()}`),
    result('bays: the Hall stays on screen', top >= 0 && top < win.innerHeight / 2, `top ${Math.round(top)}`),
    result('bays: the camera is at bay V', bay === '4', String(bay)),
  ];
}

// A tab pressed before the suits have joined the lab (the visitor got there
// first) still takes the camera to that suit, not to the bay it scrolled past.
export async function labEarlyTab(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('early tab: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready') && doc.querySelector('.hall__suit[data-suit="4"]'), 6000);
  const button = doc.querySelector('.hall__suit[data-suit="4"]');
  // In one turn, as a finger would: the tab comes into view and is pressed
  // before the observer that loads the suits has had its say.
  button.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  button.click();
  const there = await until(() => root.dataset.bay === '4', 4000);
  const bay = root.dataset.bay;
  const pressed = button.getAttribute('aria-pressed');
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('early tab: the camera reaches bay V', there, String(bay)),
    result('early tab: the tab stays pressed', pressed === 'true', String(pressed)),
  ];
}

// In the lab, Evan stands in the first room as a hologram made from his cut-out
// portrait; the photo's figure leaves the panel but still reaches screen readers.
export async function labHolo(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('holo: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready'), 6000);
  doc.getElementById('about').scrollIntoView({ behavior: 'instant' });
  await wait(1500);
  const entry = win.performance.getEntriesByType('resource').find((e) => e.name.endsWith('/img/evan-holo.webp'));
  const img = doc.querySelector('#about figure img');
  const style = img && win.getComputedStyle(img);
  const figure = img?.closest('figure');
  const box = figure?.getBoundingClientRect();
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('holo: the cut-out portrait loads', entry?.responseStatus === 200, entry ? `status ${entry.responseStatus}` : 'not requested'),
    result('holo: the photo keeps its alt text for readers', Boolean(img) && img.alt.length > 20 && style.display !== 'none' && style.visibility !== 'hidden', img ? `${style.display} ${style.visibility}` : 'missing'),
    result('holo: the photo leaves the panel', Boolean(box) && box.width <= 1 && box.height <= 1, box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'missing'),
  ];
}

// The things in the first room (the About list) are real buttons over their
// objects; each opens a card with the list's own words, and focusing one from
// elsewhere brings the camera back to the room.
export async function labSpots(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('spots: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready') && doc.querySelectorAll('#about .lab-spot').length > 0, 6000);
  doc.getElementById('about').scrollIntoView({ behavior: 'instant' });
  await wait(600);
  const want = ['Barbell', 'Floorball stick', 'Coffee machine', 'Guitar', 'Commando beret', 'Hockey stick'];
  const spots = [...doc.querySelectorAll('#about .lab-spot')];
  const names = spots.map((b) => (b.getAttribute('aria-label') || b.textContent).trim());
  const small = spots.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  const guitar = spots.find((b) => (b.getAttribute('aria-label') || b.textContent).trim() === 'Guitar');
  const words = doc.querySelector('[data-things] [data-thing="guitar"] p')?.textContent.trim();
  guitar?.focus();
  guitar?.click();
  await wait(300);
  const card = doc.querySelector('dialog.lab-card');
  const open = Boolean(card?.open);
  const title = card?.querySelector('#lab-card-title')?.textContent.trim();
  const body = card?.querySelector('.lab-card__body')?.textContent.trim();
  // What Escape does to a modal dialog (a synthetic key event does not reach
  // the browser's own handling): a cancel, then the close.
  if (card?.open) (card.requestClose ? card.requestClose() : card.close());
  await wait(300);
  const closed = Boolean(card) && !card.open;
  const back = doc.activeElement === guitar;
  doc.getElementById('contact').scrollIntoView({ behavior: 'instant' });
  await wait(600);
  const away = root.dataset.stop;
  spots.find((b) => (b.getAttribute('aria-label') || b.textContent).trim() === 'Barbell')?.focus();
  const returned = await until(() => root.dataset.stop === 'about', 800);
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('spots: six objects, named from the list', names.length === 6 && want.every((n) => names.includes(n)), names.join(', ') || 'none'),
    result('spots: each at least 44 × 44', spots.length > 0 && small.length === 0, `${small.length} small`),
    result('spots: the Guitar card opens', open && title === 'Guitar', `${open} ${title}`),
    result('spots: the card carries the list’s words', Boolean(words) && body === words, body ?? 'missing'),
    result('spots: Escape closes it and focus returns', closed && back, `${closed} ${doc.activeElement?.className}`),
    result('spots: focusing a spot brings the camera back', away === 'contact' && Boolean(returned), `${away} → ${root.dataset.stop}`),
  ];
}

// The trophy shelf (Experience): a spot on every plaque, trophy, medal and
// frame, fourteen in all, each opening that row's own words.
export async function labShelf(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('shelf: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready') && doc.querySelectorAll('#experience .lab-spot').length > 0, 6000);
  const spots = [...doc.querySelectorAll('#experience .lab-spot')];
  const name = (b) => (b.getAttribute('aria-label') || b.textContent).trim();
  const small = spots.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  const want = ['Univers', 'EvanYapFitness', 'The Social Nugget', 'Singapore Army', 'Top 5', '2nd place', 'Nominated', 'Best Combat Unit', '1 of 6'];
  const names = spots.map(name);
  const second = spots.find((b) => name(b) === '2nd place');
  const words = [...doc.querySelectorAll('#recognition dt')].find((dt) => dt.textContent.trim() === '2nd place')?.nextElementSibling?.textContent.trim();
  second?.focus();
  await wait(400);
  // A spot is drawn centred on the point its transform puts it at (the
  // panel's own margins must not reach it).
  const off = spots.filter((b) => b.classList.contains('is-shown')).filter((b) => {
    const r = b.getBoundingClientRect();
    const m = new win.DOMMatrix(win.getComputedStyle(b).transform);
    return Math.abs(r.left + r.width / 2 - m.m41) > 1 || Math.abs(r.top + r.height / 2 - m.m42) > 1;
  });
  second?.click();
  await wait(300);
  const card = doc.querySelector('dialog.lab-card');
  const open = Boolean(card?.open);
  const title = card?.querySelector('#lab-card-title')?.textContent.trim();
  const body = card?.querySelector('.lab-card__body')?.textContent.trim();
  if (card?.open) card.close();
  await wait(100);
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('shelf: fourteen spots', spots.length === 14, `${spots.length}`),
    result('shelf: roles, awards and the scholarship are named', want.every((n) => names.includes(n)), names.join(', ') || 'none'),
    result('shelf: each at least 44 × 44', spots.length > 0 && small.length === 0, `${small.length} small`),
    result('shelf: each spot centred on its object', spots.length > 0 && off.length === 0, off.map(name).join(', ') || 'all centred'),
    result('shelf: the 2nd place card opens with its words', open && title === '2nd place' && Boolean(words) && body === words, `${open} ${title} ${body ?? 'missing'}`),
  ];
}

// In the lab, Toolkit is a workbench: one object per kind of tool, each a
// spot named for its group, opening that group's tools on a hologram card.
export async function labBench(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('bench: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready') && doc.querySelectorAll('#toolkit .lab-spot').length > 0, 6000);
  const spots = [...doc.querySelectorAll('#toolkit .lab-spot')];
  const name = (b) => (b.getAttribute('aria-label') || b.textContent).trim();
  const want = ['Languages', 'Frameworks', 'AI and data', 'Cloud and tools', 'Testing', 'Design and modelling'];
  const names = spots.map(name);
  const small = spots.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  const testing = spots.find((b) => name(b) === 'Testing');
  testing?.focus();
  const count = () => spots.filter((b) => b.classList.contains('is-shown')).length;
  await until(() => count() === 6, 3000);
  const shown = count();
  testing?.click();
  await wait(300);
  const card = doc.querySelector('dialog.lab-card');
  const open = Boolean(card?.open);
  const title = card?.querySelector('#lab-card-title')?.textContent.trim();
  const tools = [...(card?.querySelectorAll('.lab-card__body li') ?? [])].map((li) => li.textContent.trim().toLowerCase());
  const holo = Boolean(card?.classList.contains('lab-card--holo'));
  if (card?.open) card.close();
  await wait(100);
  // The same card, opened next by a thing on the shelf, is a plain card again.
  doc.querySelector('#experience .lab-spot')?.click();
  await wait(100);
  const plain = Boolean(card?.open) && !card.classList.contains('lab-card--holo');
  if (card?.open) card.close();
  await wait(100);
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('bench: six spots, in the rows\' order', names.length === 6 && want.every((n, i) => names[i] === n), names.join(', ') || 'none'),
    result('bench: each at least 44 × 44', spots.length > 0 && small.length === 0, `${small.length} small`),
    result('bench: all six in the window at its stop', shown === 6, `${shown} shown`),
    result('bench: the Testing card lists its tools', open && title === 'Testing' && ['hegel', 'bombadil', 'property-based testing'].every((t) => tools.includes(t)), `${open} ${title} ${tools.join(', ')}`),
    result('bench: its card is a hologram', holo, `${holo}`),
    result('bench: the shelf\'s cards stay plain', plain, `${plain}`),
  ];
}

// In the lab, Contact is the office: its panel is the desk screen's own warm
// UI on a dark warm ground, the footer follows on the same ground, and the
// address, the copy button and the credits all still read.
export async function labOffice(win) {
  const doc = win.document;
  const root = doc.documentElement;
  if (!labCapable(win)) return [result('office: no lab in this frame', true, 'no lab')];
  await until(() => root.classList.contains('lab-ready'), 6000);
  win.scrollTo({ top: root.scrollHeight, behavior: 'instant' });
  await until(() => root.dataset.stop === 'contact', 1000);
  const stop = root.dataset.stop;
  const rgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const luminance = ([r, g, b]) => [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const copy = doc.querySelector('#contact .contact__copy');
  const copyBox = copy?.getBoundingClientRect();
  const link = doc.querySelector('#contact [data-contact-link]');
  const email = (link?.getAttribute('href') ?? '').replace(/^mailto:/, '');
  const footer = doc.querySelector('.footer');
  const ground = rgb(win.getComputedStyle(footer).backgroundColor);
  const probe = doc.createElement('i');
  probe.style.color = win.getComputedStyle(doc.getElementById('contact')).getPropertyValue('--band');
  doc.body.append(probe);
  const panel = rgb(win.getComputedStyle(probe).color);
  probe.remove();
  const warm = panel.length === 3 && luminance(panel) < 0.03 && panel[0] > panel[2];
  const credits = [...doc.querySelectorAll('.footer__credits p, .footer__credits li, .footer__credits a, .footer > .mono, .footer .wordmark')];
  const worst = credits.map((el) => ({ el, value: ratio(rgb(win.getComputedStyle(el).color), ground) }))
    .sort((a, b) => a.value - b.value)[0];
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('office: the end of the page is the office', stop === 'contact', String(stop)),
    result('office: the copy button shows, at least 44 px', Boolean(copy) && !copy.hidden && copyBox.width >= 44 && copyBox.height >= 44,
      copyBox ? `${copy.hidden ? 'hidden ' : ''}${Math.round(copyBox.width)}×${Math.round(copyBox.height)}` : 'missing'),
    result('office: the address on the screen is the email', Boolean(email) && link.textContent.trim() === email, `${link?.textContent.trim()} vs ${email}`),
    result('office: the panel is the screen\'s warm dark ground', warm, panel.join(',')),
    result('office: the footer is on the same ground', ground.join(',') === panel.join(','), `${ground.join(',')} vs ${panel.join(',')}`),
    result('office: the credits read at least 4.5:1', Boolean(worst) && worst.value >= 4.5, worst ? `${worst.el.className || worst.el.tagName} ${worst.value.toFixed(2)}:1` : 'none'),
  ];
}
