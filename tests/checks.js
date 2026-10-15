// Checks the portfolio against its spec. Each check gets the window of the
// page loaded in an iframe of a set size, and the iframe itself, and returns
// a list of { name, pass, detail }. run.js decides which checks run where.

const FIT = { minWidth: 1280, minHeight: 650 };
const WIDE = 1024;
const SHEETS = ['top', 'about', 'experience', 'work', 'toolkit', 'contact'];
const OLD_COLOURS = /#(ffb7d5|ffd98e|a9ddff|b9f2df|ff8fb1|ffe446|cdf5e6|ff9fb6|3a4a86|9b3158)|rgba\(255,\s*228|rgba\(255,\s*255,\s*255,\s*0?\.5\)/i;

const result = (name, pass, detail = '') => ({ name, pass: Boolean(pass), detail: String(detail) });
const wait = (ms) => new Promise((done) => { setTimeout(done, ms); });
const shown = (el) => {
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
};

// Six sheets in story order, each with a link to the next.
export function structure(win) {
  const sheets = [...win.document.querySelectorAll('main > .sheet')];
  const ids = sheets.map((sheet) => sheet.id).join(',');
  const out = [result('six sheets in story order', ids === SHEETS.join(','), ids)];
  sheets.forEach((sheet, i) => {
    const want = `#${SHEETS[(i + 1) % SHEETS.length]}`;
    const href = sheet.querySelector('.sheet__next')?.getAttribute('href');
    out.push(result(`${sheet.id}: next link to ${want}`, href === want, href ?? 'none'));
  });
  return out;
}

export function removed(win) {
  const doc = win.document;
  const gone = ['.keyboard', '.marquee', '[data-kinetic]', '[data-shader]', '[data-tabs]', '.chip', '.credentials'];
  const files = ['keyboard.css', 'marquee.css', 'hero.css', 'sections.css', 'contact.css', 'motion.css'];
  const hrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'));
  return [
    ...gone.map((selector) => result(`removed: ${selector}`, !doc.querySelector(selector))),
    result('removed: old stylesheets', !hrefs.some((href) => files.some((file) => href.endsWith(file))), hrefs.join(' ')),
  ];
}

// Measured against the visible width (no scrollbar), so a few px of sideways overflow still counts.
export function overflow(win) {
  const root = win.document.documentElement;
  const width = root.scrollWidth;
  const room = root.clientWidth;
  return [result('no horizontal scroll', width <= room, `scroll ${width} vs client ${room}`)];
}

export function fonts(win) {
  const loaded = [...win.document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/"/g, ''));
  return [
    result('Switzer loaded', loaded.includes('Switzer'), loaded.join(', ')),
    result('Fragment Mono loaded', loaded.includes('Fragment Mono'), loaded.join(', ')),
    result('Instrument Serif loaded', loaded.includes('Instrument Serif'), loaded.join(', ')),
  ];
}

// Below 1024px, every control a thumb needs is at least 44 × 44.
export function targets(win) {
  if (win.innerWidth >= WIDE) return [];
  const selector = '.bar a, .bar button, .project__row, .button, [data-copy], .sheet__next, .project__links a, .contact__spec a, .contact__address, .intro__actions a';
  const small = [...win.document.querySelectorAll(selector)].filter(shown).filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width < 44 || box.height < 44;
  });
  return [result('tap targets at least 44px', small.length === 0, small.map((el) => el.textContent.trim().slice(0, 30)).join(' | '))];
}

// At the fit sizes each sheet is exactly one screen below the bar. Selected
// work is measured once per project, since each panel has a different length;
// 4.1 is reopened at the end. The detail reads "height vs room", then the
// slack: how much room is left over once the min-height is taken away.
export function fit(win) {
  if (win.innerWidth < FIT.minWidth || win.innerHeight < FIT.minHeight) return [];
  const doc = win.document;
  const room = win.innerHeight - doc.querySelector('.bar').getBoundingClientRect().height - 12;
  const measure = (name, sheet) => {
    const height = sheet.getBoundingClientRect().height;
    sheet.style.minHeight = '0px';
    const natural = sheet.getBoundingClientRect().height;
    sheet.style.minHeight = '';
    return result(name, Math.abs(height - room) <= 1, `${Math.round(height)} vs ${Math.round(room)}, slack ${Math.round(room - natural)}`);
  };
  const out = [...doc.querySelectorAll('main > .sheet')].map((sheet) => measure(`${sheet.id}: fits one screen`, sheet));
  const rows = [...doc.querySelectorAll('.project__row')];
  rows.forEach((row, i) => {
    row.click();
    out.push(measure(`work (4.${i + 1} open): fits one screen`, doc.getElementById('work')));
  });
  rows[0]?.click();
  return out;
}

// The same, with the wider fallback fonts a visitor gets if the web fonts fail.
export async function fitFallback(win) {
  if (win.innerWidth < FIT.minWidth || win.innerHeight < FIT.minHeight) return [];
  const root = win.document.documentElement;
  root.style.setProperty('--font-sans', 'Arial, sans-serif');
  root.style.setProperty('--font-mono', 'Menlo, Consolas, monospace');
  root.style.setProperty('--font-serif', 'Georgia, "Times New Roman", serif');
  await wait(50);
  const out = fit(win).map((each) => ({ ...each, name: `${each.name} (fallback fonts)` }));
  root.style.removeProperty('--font-sans');
  root.style.removeProperty('--font-mono');
  root.style.removeProperty('--font-serif');
  return out;
}

export function palette(win) {
  const stale = [...win.document.querySelectorAll('svg [fill], svg [stroke]')]
    .filter((el) => OLD_COLOURS.test(`${el.getAttribute('fill')} ${el.getAttribute('stroke')}`));
  return [result('figures use only the new palette', stale.length === 0, `${stale.length} old colours`)];
}

export function figureCaptions(win) {
  const labels = [...win.document.querySelectorAll('.reel__name b')].map((b) => b.textContent.trim());
  const want = ['Fig. 4.1', 'Fig. 4.2', 'Fig. 4.3', 'Fig. 4.4', 'Fig. 4.5', 'Fig. 4.6'];
  return [result('figures numbered 4.1 to 4.6', labels.join() === want.join(), labels.join())];
}

export function cartoon(win) {
  const art = win.document.querySelector('#top [data-wave] svg[role="img"]');
  return [result('cartoon waves in the intro, recoloured', art && art.querySelector('circle[fill="#2541e6"]') && !art.querySelector('[fill="#ff9fb6"]'))];
}

export function work(win) {
  const doc = win.document;
  const rows = [...doc.querySelectorAll('.project__row')];
  const panels = [...doc.querySelectorAll('.project__panel')];
  const open = () => panels.filter((panel) => !panel.hidden).map((panel) => panel.id).join();
  const accordion = win.innerWidth < WIDE;
  const out = [
    result('six projects', rows.length === 6 && panels.length === 6, `${rows.length} rows, ${panels.length} panels`),
    result('4.1 open on load', open() === panels[0]?.id, open()),
  ];
  rows[2].click();
  out.push(result('choosing 4.3 opens only 4.3', open() === panels[2].id, open()));
  out.push(result('rows report their state', rows[2].getAttribute('aria-expanded') === 'true' && rows[0].getAttribute('aria-expanded') === 'false'));
  rows[2].click();
  out.push(accordion
    ? result('tapping the open row closes it', open() === '', open())
    : result('clicking the open row keeps it open', open() === panels[2].id, open()));
  rows[0].click();
  return out;
}

// Diagram text in an open project is large enough to read: the smallest note
// renders at least 9px at the fit sizes, 8px from 1024px wide and 7px below.
// Opens 4.2 (the first project with a diagram) to measure, then reopens 4.1.
export function figureText(win) {
  const doc = win.document;
  const min = win.innerWidth >= 1280 ? 9 : win.innerWidth >= WIDE ? 8 : 7;
  doc.getElementById('row-assistant-bot')?.click();
  const notes = [...doc.querySelectorAll('.project__panel:not([hidden]) .reel__text--note')].filter(shown);
  const sizes = notes.map((text) => parseFloat(win.getComputedStyle(text).fontSize) * text.ownerSVGElement.getScreenCTM().a);
  doc.getElementById('row-website-revamp')?.click();
  if (!sizes.length) return [result('diagram notes readable', false, 'no visible notes in 4.2')];
  const smallest = Math.min(...sizes);
  return [result(`diagram notes at least ${min}px`, smallest >= min - 0.05, `${smallest.toFixed(1)}px`)];
}

export function deepLink(win) {
  const id = win.location.hash.slice(1);
  const row = win.document.getElementById(id)?.querySelector('.project__row');
  const panel = row && win.document.getElementById(row.getAttribute('aria-controls'));
  return [result(`#${id} opens that project`, panel && !panel.hidden)];
}

// Closes every project on a phone-width page, then widens it past 1024.
export async function crossToWide(win, frame) {
  win.document.querySelector('.project__row[aria-expanded="true"]')?.click();
  frame.width = '1440';
  frame.height = '800';
  await wait(400);
  const open = [...win.document.querySelectorAll('.project__panel')].filter((panel) => !panel.hidden);
  return [result('widening past 1024px opens one project', open.length === 1, `${open.length} open`)];
}

export async function sheetIndex(win) {
  const doc = win.document;
  doc.getElementById('experience').scrollIntoView({ behavior: 'instant' });
  await wait(300);
  const number = doc.querySelector('[data-where-n]')?.textContent;
  const current = doc.querySelector('.ticks a[aria-current="true"]')?.getAttribute('href');
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  return [
    result('index follows the sheet on screen', number === '03' && current === '#experience', `${number} ${current}`),
  ];
}

// The page scrolls to the hash smoothly, so wait for it to stop first.
export async function hashSheet(win) {
  let last = -1;
  for (let i = 0; i < 40 && win.scrollY !== last; i += 1) {
    last = win.scrollY;
    await wait(150);
  }
  const number = win.document.querySelector('[data-where-n]')?.textContent;
  return [result('arriving at #toolkit marks sheet 05', number === '05', number)];
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
  out.push(result('menu opens', !panel.hidden && button.getAttribute('aria-expanded') === 'true' && main.inert === true, `inert ${main.inert}`));
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  out.push(result('Escape closes it', panel.hidden && button.getAttribute('aria-expanded') === 'false' && main.inert === false, `inert ${main.inert}`));
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
