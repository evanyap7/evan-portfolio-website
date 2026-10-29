// Checks the portfolio against its spec. Each check gets the window of the
// page loaded in an iframe of a set size, and the iframe itself, and returns
// a list of { name, pass, detail }. run.js decides which checks run where.

const WIDE = 1024;
const SECTIONS = ['top', 'about', 'experience', 'work', 'toolkit', 'contact'];
const CARDS = ['website-revamp', 'assistant-bot', 'trading-agent', 'research-agent', 'v-bay', 'parallel-match', 'others'];
// The drawing-set palette (paper, desk, ink, accent) and the pastels before it.
const OLD_COLOURS = /#(fafaf7|e6e5e0|111214|4f5156|6c6e72|2541e6|ffb7d5|ffd98e|a9ddff|b9f2df|ff8fb1|ffe446|cdf5e6|ff9fb6|3a4a86|9b3158)\b|rgba\(17,\s*18,\s*20|rgba\(37,\s*65,\s*230/i;

const result = (name, pass, detail = '') => ({ name, pass: Boolean(pass), detail: String(detail) });
const wait = (ms) => new Promise((done) => { setTimeout(done, ms); });
const shown = (el) => {
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
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
  return ['Geist', 'Geist Mono', 'Instrument Serif', 'Satoshi']
    .map((family) => result(`${family} loaded`, loaded.includes(family), [...new Set(loaded)].join(', ')));
}

// Below 1024px, every control a thumb needs is at least 44 × 44. The diagram
// pause button is 32px drawn with a 48px hit area (a pseudo-element), so
// it is measured by that area.
export function targets(win) {
  if (win.innerWidth >= WIDE) return [];
  const selector = '.nav a, .nav button, .menu a, .pill, .work__card, .kit__tab, [data-copy], .contact__address, .back, .next, .footer a';
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
    const pale = (shownBg.match(/rgba?\([^)]*\)/g) || []).some((c) => c.match(/[\d.]+/g).slice(0, 3).every((v) => Number(v) >= 230));
    out.push(result('Contact is the light band', band.id === 'contact' && pale, shownBg.slice(0, 60)));
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
  const grid = win.document.querySelector('#work .work__grid');
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
    result('seven work cards, in order', ids === CARDS.join(','), ids),
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
// which runs through all seven and back to the start.
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

// The Toolkit section is a WAI-ARIA tabs widget: each tab names its panel and
// the panel names it back, one tab is selected and in the tab order, one
// panel shows, and the arrow keys, Home and End move the selection.
export function tabs(win) {
  const doc = win.document;
  const list = doc.querySelector('#toolkit [role="tablist"]');
  const tabs = [...doc.querySelectorAll('#toolkit [role="tab"]')];
  const panels = tabs.map((tab) => doc.getElementById(tab.getAttribute('aria-controls')));
  const names = tabs.map((tab) => tab.textContent.trim()).join(',');
  const selected = () => tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true');
  const visible = () => panels.filter((panel) => panel && !panel.hidden && shown(panel));
  const wired = panels.every((panel, i) => panel?.getAttribute('role') === 'tabpanel' && panel.getAttribute('aria-labelledby') === tabs[i].id);
  const roving = () => tabs.every((tab) => tab.tabIndex === (tab.getAttribute('aria-selected') === 'true' ? 0 : -1));
  const out = [
    result('toolkit tabs: four, in order', list && shown(list) && names === 'Toolkit,Recognition,Education,Certifications', names),
    result('toolkit tabs: each tab and panel name each other', wired),
    result('toolkit tabs: Toolkit selected on load, one panel shown', selected().length === 1 && selected()[0] === tabs[0] && visible().length === 1 && visible()[0] === panels[0] && roving(), visible().map((panel) => panel.id).join()),
  ];
  const press = (key) => doc.activeElement.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  tabs[0].focus();
  press('ArrowRight');
  const right = selected()[0] === tabs[1] && doc.activeElement === tabs[1] && visible()[0] === panels[1] && visible().length === 1;
  press('End');
  const end = selected()[0] === tabs[3] && doc.activeElement === tabs[3];
  press('ArrowRight');
  const wrap = selected()[0] === tabs[0];
  press('ArrowLeft');
  const back = selected()[0] === tabs[3];
  press('Home');
  const home = selected()[0] === tabs[0] && visible()[0] === panels[0];
  out.push(result('toolkit tabs: arrows, Home and End move the selection', right && end && wrap && back && home && roving(), `${right} ${end} ${wrap} ${back} ${home}`));
  tabs[2].click();
  out.push(result('toolkit tabs: clicking a tab shows only its panel', visible().length === 1 && visible()[0] === panels[2]));
  tabs[0].click();
  doc.activeElement?.blur();
  return out;
}

// Arriving at #education or #certifications opens that tab.
export function tabLink(win) {
  const id = win.location.hash.slice(1);
  const panel = win.document.getElementById(id);
  const tab = panel && win.document.getElementById(panel.getAttribute('aria-labelledby'));
  return [result(`#${id} opens its tab`, panel && !panel.hidden && shown(panel) && tab?.getAttribute('aria-selected') === 'true')];
}

// An old project link such as #work-trading-agent lands on that card.
export async function deepLink(win) {
  // Give the browser time to start the jump before waiting for it to settle.
  await wait(800);
  let last = -1;
  for (let i = 0; i < 40 && win.scrollY !== last; i += 1) {
    last = win.scrollY;
    await wait(150);
  }
  const id = win.location.hash.slice(1);
  const card = win.document.getElementById(id);
  const top = card?.getBoundingClientRect().top ?? -1;
  return [result(`#${id} lands on its card`, card?.matches('.work__card') && top >= 0 && top < win.innerHeight / 2, `top ${Math.round(top)}`)];
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
  'hero-title': 'Most students study AI. I ship it.',
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

// Typing the wake word works too.
export async function gateTyped(win) {
  const doc = win.document;
  const was = doc.documentElement.classList.contains('gated');
  [...'xego'].forEach((key) => doc.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true })));
  await wait(1200);
  return [result('gate: typing “ego” wakes the site', was && !doc.documentElement.classList.contains('gated'))];
}
