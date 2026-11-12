// Checks the portfolio against its spec. Each check gets the window of the
// page loaded in an iframe of a set size, and the iframe itself, and returns
// a list of { name, pass, detail }. run.js decides which checks run where.

const WIDE = 1024;
// The sections in page order. Only the hero has a shot in the scene; the rest
// are sheets laid over it.
const SECTIONS = ['top', 'about', 'work', 'experience', 'toolkit', 'contact'];
const CARDS = ['assistant-bot', 'trading-agent', 'website-revamp', 'parallel-match', 'research-agent', 'v-bay', 'watchpartyyy', 'others'];
// The Mark each old card link (#work-<slug>) picks in the Projects picker
// (js/projects.js), and the Mark shown first.
const MARK_OF = {
  'trading-agent': 0, 'assistant-bot': 1, 'research-agent': 2, 'parallel-match': 3,
  'website-revamp': 4, 'v-bay': 5, watchpartyyy: 6, others: 6,
};
const FIRST_MARK = 1;
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
  return ['Instrument Sans', 'Instrument Serif', 'Satoshi']
    .map((family) => result(`${family} loaded`, loaded.includes(family), [...new Set(loaded)].join(', ')));
}

// Below 1024px, every control a thumb needs is at least 44 × 44. The diagram
// pause button is 32px drawn with a 48px hit area (a pseudo-element), so
// it is measured by that area.
export function targets(win) {
  if (win.innerWidth >= WIDE) return [];
  const selector = '.nav a, .nav button, .menu a, .pill, .work__card, .index__cell, .marks button, .pause, .cta, .inter__next, [data-copy], .contact__address, .back, .next, .footer a';
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
// the tokens: the four greys on the ink sheets, their bands and the head of
// a card; the titanium paper sheets' greys and accent on the paper, and
// their dark pills; and the focus ring at 3:1 on both.
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

  const sheet = doc.querySelector('.slab--paper');
  if (!sheet) return [...out, result('paper sheets present', false)];
  const paper = tokens(sheet);
  ['--text', '--text-2', '--muted', '--dim', '--accent'].forEach((fg) => pair(`paper ${fg}`, paper(fg), paper('--bg'), 4.5));
  pair('paper solid pill text', paper('--bg'), paper('--text'), 4.5);
  pair('paper focus ring', paper('--focus'), paper('--bg'), 3);
  // The sheets alternate as designed: About, Experience and Contact on paper,
  // Toolkit and the Projects chapter on ink.
  const papers = [...doc.querySelectorAll('main > .slab--paper')].map((s) => s.id).join(',');
  out.push(result('paper sheets are About, Experience and Contact', papers === 'about,experience,contact', papers));
  const painted = rgb(win.getComputedStyle(doc.getElementById('contact')).backgroundColor).join(',');
  out.push(result('Contact is painted in the paper', painted === rgb(paper('--bg')).join(','), painted));
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

// The Projects chapter: one h2 titled Projects, a picker of seven Marks with
// one pressed, the Mark's name whole on its stage, and the light sheet's link
// to the project's page, which exists.
export async function opener(win) {
  const doc = win.document;
  const title = doc.getElementById('work-title');
  const buttons = [...doc.querySelectorAll('#work .marks button')];
  const pressed = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true');
  const stage = doc.querySelector('#work .opener__stage');
  const name = doc.getElementById('p-name');
  const cta = doc.querySelector('#work .paper .cta');
  const code = cta ? await win.fetch(cta.href, { cache: 'no-store' }).then((response) => response.status, () => 0) : 0;
  const s = stage?.getBoundingClientRect();
  const n = name?.getBoundingClientRect();
  return [
    result('Projects: one chapter, titled Projects', title?.tagName === 'H2' && title.textContent.trim() === 'Projects' && Boolean(title.closest('#work')), title?.textContent),
    result('Projects: seven Marks in the picker, one pressed', buttons.length === 7 && pressed.length === 1, `${buttons.length} marks, ${pressed.length} pressed`),
    result('Projects: the Mark\'s name sits whole on its stage', Boolean(s && n) && n.left >= s.left - 1 && n.right <= s.right + 1 && name.scrollWidth <= name.clientWidth + 1,
      n ? `name ${Math.round(n.left)}–${Math.round(n.right)} in stage ${Math.round(s.left)}–${Math.round(s.right)}` : 'missing'),
    result('Projects: the sheet links to a project page that exists', code === 200, cta?.getAttribute('href')),
  ];
}

// The old cards stay in the page as the list of every project: what shows
// without the picker's script, and where #work-… ids still live. Each is one
// link to a page that exists, named by its title.
export async function workCards(win) {
  const doc = win.document;
  const cards = [...doc.querySelectorAll('#work .work__card')];
  const ids = cards.map((card) => card.id.replace('work-', '')).join(',');
  const list = doc.querySelector('#work .paper__all');
  const picking = doc.documentElement.classList.contains('marks-on');
  const out = [
    result('the list of every project hides while the picker runs', Boolean(list) && (!picking || !shown(list)), picking ? 'picker on' : 'no picker'),
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
    result('honours: 3 awards, 1 scholarship, 2 certificates, 3 schools', rows === '3,1,2,3', rows),
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

// An old project link such as #work-trading-agent picks that project's Mark
// and lands on the Projects chapter. Without the picker it lands on the card.
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
  if (!doc.documentElement.classList.contains('marks-on')) {
    const card = doc.getElementById(id);
    const top = card?.getBoundingClientRect().top ?? -1;
    return [result(`#${id} lands on its card`, card?.matches('.work__card') && top >= 0 && top < win.innerHeight / 2, `top ${Math.round(top)}`)];
  }
  const want = MARK_OF[key];
  const button = doc.querySelector(`#work .marks button[data-mark="${want}"]`);
  const top = doc.getElementById('work').getBoundingClientRect().top;
  return [
    result(`#${id} picks Mark ${want + 1}`, button?.getAttribute('aria-pressed') === 'true', button?.textContent.trim()),
    result(`#${id} lands on Projects`, top > -2 && top < win.innerHeight / 2, `top ${Math.round(top)}`),
  ];
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
  'hero-title': 'Evan Yap',
  'about-title': 'About me',
  'experience-title': 'My experience',
  'work-title': 'Projects',
  'toolkit-title': 'My toolkit',
  'contact-title': 'Let’s talk',
};

export async function titles(win) {
  const doc = win.document;
  const heads = [...doc.querySelectorAll('.hero__title, .title, .project__title, #work-title')];
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

// Presses and holds the reactor for ms, then lets go.
async function holdReactor(win, ms) {
  const hit = win.document.querySelector('[data-reactor-hit]');
  const at = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true };
  hit.dispatchEvent(new win.PointerEvent('pointerdown', at));
  await wait(ms);
  hit.dispatchEvent(new win.PointerEvent('pointerup', at));
}

// The gate: a first visit opens dark, with the reactor, its charge meter and
// the hint beside the hero's headline, pitch, resume and email, which are up
// and readable; the rest of the page is hidden and out of reach.
// Holding the reactor charges it; let go early and it drains, still shut;
// hold on to 100% and the site wakes, and the session remembers that.
export async function gate(win) {
  const doc = win.document;
  const root = doc.documentElement;
  const hit = doc.querySelector('[data-reactor-hit]');
  const meter = doc.querySelector('[data-gate-meter]');
  const hidden = (el) => win.getComputedStyle(el).visibility === 'hidden';
  const pct = () => Number.parseInt(meter?.textContent, 10);
  const out = [
    result('gate: a first visit opens gated', root.classList.contains('gated')),
    result('gate: the reactor is the way in, at least 44px and in reach', hit && shown(hit) && !hit.closest('[inert]') && hit.offsetHeight >= 44, hit ? `${hit.offsetWidth}×${hit.offsetHeight}` : 'missing'),
    result('gate: no Activate button, microphone or typed word', !doc.querySelector('[data-gate-activate], [data-gate-mic]') && !/ego/i.test(doc.querySelector('[data-gate]').textContent)),
    result('gate: the hint says to hold the reactor', /hold/i.test(doc.querySelector('.gate__hint')?.textContent ?? '') && shown(doc.querySelector('.gate__hint'))),
    result('gate: nav and sections hidden and inert', hidden(doc.querySelector('.nav')) && doc.querySelector('.nav').inert
      && [...doc.querySelectorAll('main > section:not(.hero)')].every((section) => hidden(section) && section.inert)),
    result('gate: the name and pitch are readable behind the gate', [...doc.querySelectorAll('.hero__title, .hero__lede')]
      .every((el) => shown(el) && !hidden(el) && !el.closest('[inert]'))),
  ];
  // A short hold charges part way, then drains, and the door stays shut.
  let part = 0;
  const peek = wait(500).then(() => { part = pct(); });
  await holdReactor(win, 500);
  await peek;
  await wait(900);
  out.push(
    result('gate: holding charges the meter', part > 10 && part < 100, `${part}%`),
    result('gate: letting go early drains it and stays shut', pct() === 0 && root.classList.contains('gated'), `${pct()}%`),
  );
  await holdReactor(win, 1900);
  await wait(900);
  let stored = null;
  try {
    stored = win.sessionStorage.getItem('portfolio-on');
  } catch {
    stored = 'blocked';
  }
  out.push(
    result('gate: holding to 100% wakes the site', !root.classList.contains('gated') && !doc.querySelector('.nav').inert && !hidden(doc.querySelector('.hero__title'))),
    result('gate: the session remembers it', stored === '1' || stored === 'blocked', String(stored)),
  );
  return out;
}

// Holding Space on the reactor works the same as holding it with a pointer.
export async function gateKeys(win) {
  const doc = win.document;
  const root = doc.documentElement;
  const hit = doc.querySelector('[data-reactor-hit]');
  const was = root.classList.contains('gated');
  hit.focus();
  hit.dispatchEvent(new win.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  await wait(1900);
  hit.dispatchEvent(new win.KeyboardEvent('keyup', { key: ' ', bubbles: true }));
  await wait(900);
  return [result('gate: holding Space on the reactor wakes the site', was && !root.classList.contains('gated'))];
}

// A recruiter with six seconds is never stuck: the resume and email are
// reachable behind the gate. The gate itself never opens on its own: not
// with time, not on a scroll, not on a click elsewhere.
export async function gateWaits(win) {
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
  doc.dispatchEvent(new win.WheelEvent('wheel', { deltaY: 120, bubbles: true }));
  doc.body.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true, button: 0 }));
  [...'xego'].forEach((key) => doc.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true })));
  await wait(4000);
  out.push(result('gate: never opens by itself, on a scroll, a click or typing', root.classList.contains('gated')));
  return out;
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

// The scene: a photograph of the workshop fixed behind the hero; the other
// sections are sheets laid over it. Every browser that runs modules gets it;
// reduced motion keeps it, still: no clip, no drift.
export async function scene(win) {
  const doc = win.document;
  const root = doc.documentElement;
  const still = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ready = await until(() => root.classList.contains('lab-ready'), 6000);
  const scenes = doc.querySelectorAll('.scene');
  const el = scenes[0];
  const style = el && win.getComputedStyle(el);
  const box = el?.getBoundingClientRect();
  // The visible width. Headless Chrome reports root.clientWidth without the
  // scrollbar it still lays out, so the visual viewport is the honest number.
  const vw = Math.round(win.visualViewport?.width ?? root.clientWidth);
  const vh = root.clientHeight;
  const shots = [...doc.querySelectorAll('.scene__shot')].map((shot) => shot.dataset.shot).join(',');
  const moving = Boolean(doc.querySelector('.scene__video'));
  return [
    result('scene is ready within 6 s', ready && root.classList.contains('lab')),
    result('one scene', scenes.length === 1, `${scenes.length}`),
    result('scene is fixed, hidden from readers and lets clicks through',
      style?.position === 'fixed' && el.getAttribute('aria-hidden') === 'true' && style.pointerEvents === 'none',
      style ? `${style.position} ${el.getAttribute('aria-hidden')} ${style.pointerEvents}` : 'missing'),
    result('scene fills the screen', box && Math.abs(box.width - vw) <= 1 && Math.abs(box.height - vh) <= 1,
      box ? `${Math.round(box.width)}×${Math.round(box.height)} of ${vw}×${vh}` : 'missing'),
    result('one shot, the hero\'s', shots === 'top', shots),
    result(still ? 'reduced motion: no clip' : 'the hero clip is there', still ? !doc.querySelector('.scene__video') : moving),
  ];
}

// The hero's loop can be paused, and played again, from a button in the hero.
export async function scenePause(win) {
  const doc = win.document;
  await until(() => doc.documentElement.classList.contains('lab-ready'), 6000);
  const button = doc.querySelector('[data-scene-pause]');
  const video = doc.querySelector('.scene__video');
  if (!video) return [result('pause: no clip, so no button', !button || button.hidden)];
  if (!button) return [result('pause: the hero has a pause button', false, 'missing')];
  const shownFirst = shown(button) && !button.hidden;
  button.click();
  await wait(150);
  const held = button.getAttribute('aria-pressed') === 'true' && video.paused && /play/i.test(button.textContent);
  button.click();
  await until(() => !video.paused, 1500);
  const back = button.getAttribute('aria-pressed') === 'false' && /pause/i.test(button.textContent);
  return [
    result('pause: the button is shown in the hero', shownFirst && Boolean(button.closest('#top'))),
    result('pause: pressing it holds the clip', held, `pressed ${button.getAttribute('aria-pressed')}, paused ${video.paused}`),
    result('pause: pressing again lets it play', back && !video.paused, `paused ${video.paused}`),
  ];
}

// Once a sheet covers the hero its clip stops; back at the top it plays.
export async function sceneCover(win) {
  const doc = win.document;
  const root = doc.documentElement;
  await until(() => root.classList.contains('lab-ready'), 6000);
  const video = doc.querySelector('.scene__video');
  doc.getElementById('experience').scrollIntoView({ behavior: 'instant' });
  const covered = await until(() => root.classList.contains('hero-covered'), 1500);
  await wait(100);
  const stopped = !video || video.paused;
  win.scrollTo({ top: 0, behavior: 'instant' });
  const uncovered = await until(() => !root.classList.contains('hero-covered'), 1500);
  const playing = !video || await until(() => !video.paused, 1500);
  return [
    result('cover: a sheet over the hero marks it covered', covered),
    result('cover: the hero clip stops while covered', stopped),
    result('cover: back at the top it is uncovered and plays', uncovered && playing, `paused ${video?.paused}`),
  ];
}

// The arc reactor is the scene's door: a first visit finds the room dark, and
// waking the site brings it up.
export async function gateDoor(win) {
  const root = win.document.documentElement;
  await until(() => root.classList.contains('lab-ready') || !root.classList.contains('gated'), 6000);
  const shut = root.classList.contains('gated') ? !root.classList.contains('door-open') : 'woke before the scene was ready';
  await holdReactor(win, 1900);
  await wait(1400);
  return [
    result('door: shut while the site is gated', shut === true, String(shut)),
    result('door: holding the reactor to full opens it', root.classList.contains('door-open')),
  ];
}

// A link into the page, or a visitor already let in this session, finds the
// door already open, with the hero's shot up.
export async function sceneDoor(win) {
  const root = win.document.documentElement;
  await until(() => root.classList.contains('lab-ready'), 6000);
  const first = root.classList.contains('door-open');
  return [
    result('door: already open', first),
    result('door: the hero\'s shot is up', root.dataset.stop === 'top', String(root.dataset.stop)),
  ];
}

// On a wide screen the suit's stage is whole on screen when the Projects
// chapter is; on a phone it is shown in the stacked layout.
export async function openerStage(win) {
  const doc = win.document;
  const stage = doc.querySelector('#work .opener__stage');
  if (!stage) return [result('stage: the suit\'s stage is in Projects', false, 'missing')];
  if (win.innerWidth < WIDE) return [result('stage: the suit\'s stage is in Projects', shown(stage))];
  doc.getElementById('work').scrollIntoView({ behavior: 'instant' });
  await wait(300);
  const box = stage.getBoundingClientRect();
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('stage: the suit is whole on screen', box.top >= -1 && box.bottom <= win.innerHeight + 1 && box.right <= win.innerWidth && box.width >= 300,
      `${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}×${Math.round(box.height)}`),
  ];
}

// The picker: the hint says only that the suit can be turned; choosing a Mark
// names it, says so to a screen reader, and presses the same Mark in the rail.
export async function picker(win) {
  const doc = win.document;
  const button = doc.querySelector('#work .marks button[data-mark="3"]');
  if (!button) return [result('picker: Mark IV is in the picker', false, 'missing')];
  const hint = doc.querySelector('.opener__hint')?.textContent.trim();
  button.click();
  const named = await until(() => doc.getElementById('p-name')?.textContent.trim() === 'Parallel Match', 2000);
  const status = doc.getElementById('p-status')?.textContent.trim();
  const rail = [...doc.querySelectorAll('[data-rail-marks] button')];
  const railPressed = rail.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.mark).join(',');
  const pressed = [...doc.querySelectorAll('#work .marks button[aria-pressed="true"]')].map((b) => b.dataset.mark).join(',');
  doc.querySelector(`#work .marks button[data-mark="${FIRST_MARK}"]`)?.click();
  await until(() => doc.getElementById('p-name')?.textContent.trim() === 'E.G.O', 2000);
  return [
    result('picker: the hint says only Drag to turn, no render passes', hint === 'Drag to turn' && !doc.querySelector('.hall__pass'), hint),
    result('picker: choosing Mark IV names it', named && pressed === '3', `${doc.getElementById('p-name')?.textContent.trim()} (pressed ${pressed})`),
    result('picker: a screen reader is told which Mark', status === 'Mark IV, Parallel Match', status),
    result('picker: the rail presses the same Mark', rail.length === 0 || railPressed === '3', railPressed),
  ];
}
