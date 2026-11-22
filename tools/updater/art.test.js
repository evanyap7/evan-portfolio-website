import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeSvg, generateArt, UnsafeSvgError } from './art.js';

const wrap = (inner, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1600"${attrs}>${inner}</svg>`;
const ctx = { name: 'demo', description: 'd', readme: 'r', languages: [], topics: [], commits: [] };
const draft = { name: 'Demo', role: 'Dev', blurb: 'b', line: ['a', 'b', 'c'], sub: 's', chips: [], rows: [], stack: [], claims: [], slug: 'demo' };
const spec = { model: 'mark-7', paint: { base: 0x112233, accent: 0xddeeff, metal: 0.5, rough: 0.4 }, paintName: 'Blue', colours: ['#112233', '#ddeeff'], hue: 210 };

const bad = /on\w+\s*=|<\s*\/?\s*[\w:]*script|foreign|href|javascript|evil|e\.test|style|\\75|image-set|@import|<\s*use|<\s*image|<\s*a[\s>]|xmlns:/i;
// Outcome must be fail-closed: either UnsafeSvgError or output free of every dangerous construct.
function neutral(input) {
  let out;
  try {
    out = sanitizeSvg(input);
  } catch (e) {
    assert.ok(e instanceof UnsafeSvgError, String(e));
    return;
  }
  assert.doesNotMatch(out.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, ''), bad, out);
  assert.doesNotMatch(out.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, ''), /(?:^|[^\w])on\w+=/i, out);
}

test('keeps benign art including fragment url() paint', () => {
  const s = wrap('<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="5" height="5" fill="url(#g)" transform="translate(1 2) rotate(-7)"/><text x="1" font-family="ui-monospace, \'SF Pro\'">a $ b</text>');
  const out = sanitizeSvg(s);
  assert.match(out, /fill="url\(#g\)"/);
  assert.match(out, /<text x="1"/);
  assert.match(out, /a \$ b/);
});

test('round-trips the real ego plate', () => {
  const src = readFileSync(new URL('../../img/art/ego.svg', import.meta.url), 'utf8');
  assert.equal(sanitizeSvg(src), src.trim());
});

test('removes attributes outside the allowlist, keeps the element', () => {
  const out = sanitizeSvg(wrap('<rect width="1" class="x" style="fill:red" data-a="1" ONLOAD="x()" onclick="y()"/>'));
  assert.equal(out.includes('<rect width="1"/>'), true, out);
});

test('bypass: no whitespace between attributes', () => {
  neutral(wrap('<rect width="1"onload="alert(1)"/>'));
  neutral(wrap('<a width="1"href="javascript:alert(1)"><rect/></a>'));
  neutral('<svg xmlns="http://www.w3.org/2000/svg"onload="alert(1)"><rect/></svg>');
  assert.doesNotMatch(sanitizeSvg(wrap('<rect width="1"onload="alert(1)"/>')), /onload/);
  assert.doesNotMatch(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"onload="alert(1)"><rect/></svg>'), /onload/);
});

test('bypass: slash, case and newline forms', () => {
  neutral(wrap('<rect/onload=alert(1)>'));
  neutral(wrap('<rect/onload=alert(1) width="1"/>'));
  neutral('<svg/onload=alert(1) xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
  neutral(wrap('<RECT OnLoad="alert(1)"/><ScRiPt>alert(1)</ScRiPt>'));
  neutral(wrap('<rect\nonload\n=\n"alert(1)"\nwidth="1"/>'));
  neutral(wrap('<rect width="1"\n\tHREF = \'javascript:alert(1)\'/>'));
  assert.doesNotMatch(sanitizeSvg(wrap('<rect/onload=alert(1) width="1"/>')), /onload/);
  assert.doesNotMatch(sanitizeSvg(wrap('<rect\nonload\n=\n"alert(1)"\nwidth="1"/>')), /onload/);
});

test('bypass: namespace-prefixed elements', () => {
  const ns = ' xmlns:x="http://www.w3.org/2000/svg"';
  assert.throws(() => sanitizeSvg(wrap('<x:script>alert(1)</x:script>', ns)), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<x:foreignObject><div/></x:foreignObject>', ns)), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<rect/>', ns)), UnsafeSvgError);
});

test('bypass: CSS escapes, image-set, style', () => {
  neutral(wrap('<rect style="background:\\75rl(http://evil.test/a)"/>'));
  neutral(wrap('<rect style="background-image:image-set(\'http://evil.test/a\' 1x)"/>'));
  assert.doesNotMatch(sanitizeSvg(wrap('<rect style="background:\\75rl(http://evil.test/a)" width="1"/>')), /style|evil/);
  assert.throws(() => sanitizeSvg(wrap('<style>rect{fill:url(http://evil.test)}</style>')), UnsafeSvgError);
  for (const v of ['url(http://evil.test/x)', 'url("//e.test")', "url('javascript:1')", '\\75rl(#g)', 'javascript:1', 'expression(1)', 'url(#g) url(http://e.test)', 'image-set(a 1x)']) {
    assert.throws(() => sanitizeSvg(wrap(`<rect fill="${v}"/>`)), UnsafeSvgError, v);
    assert.throws(() => sanitizeSvg(wrap(`<rect stroke='${v}'/>`)), UnsafeSvgError, v);
  }
  assert.throws(() => sanitizeSvg(wrap('<rect transform="url(#g)"/>')), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<rect width="1:2"/>')), UnsafeSvgError);
});

test('disallowed elements fail closed: script, foreignObject, use, image, a, filter, animate, set', () => {
  for (const el of ['<script>alert(1)</script>', '<SCRIPT src="x"/>', '<foreignObject><div>hi</div></foreignObject>',
    '<use href="#g"/>', '<use href="https://evil.test/a.svg#x"/>', '<image href="https://evil.test/a.png"/>', '<image href="//evil.test/x"/>',
    '<a xlink:href="javascript:alert(1)"><rect/></a>', '<filter id="f"><feImage href="http://e.test"/></filter>',
    '<animate attributeName="href" to="http://e.test"/>', '<set attributeName="href" to="javascript:1"/>',
    '<scr<script>ipt>alert(1)</scr</script>ipt>', '<!-- c --><rect/>', '<![CDATA[x]]>']) {
    assert.throws(() => sanitizeSvg(wrap(el)), UnsafeSvgError, el);
  }
});

test('rejects xmlns prefixes and foreign default namespace', () => {
  assert.throws(() => sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect/></svg>'), UnsafeSvgError);
  assert.throws(() => sanitizeSvg('<svg xmlns="http://evil.test/x"><rect/></svg>'), UnsafeSvgError);
});

test('rejects malformed structure and stray entities', () => {
  assert.throws(() => sanitizeSvg(wrap('<g><rect/></svg>')), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<rect width="1')), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<text>&foo;</text>')), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<text>&#60;script&#62;</text>')), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('stray text')), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<rect/>') + '<rect/>'.repeat(0) + '<svg/>'), UnsafeSvgError);
});

test('throws UnsafeSvgError for no svg root, oversize, DOCTYPE/ENTITY', () => {
  assert.throws(() => sanitizeSvg('<div>nope</div>'), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(''), UnsafeSvgError);
  assert.throws(() => sanitizeSvg(wrap('<rect/>' + 'a'.repeat(150 * 1024))), UnsafeSvgError);
  assert.throws(() => sanitizeSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + wrap('&x;')), UnsafeSvgError);
});

test('generateArt calls claude, sanitises and defaults focus', async () => {
  let seen;
  const call = async (a) => {
    seen = a;
    return { svg: wrap('<rect width="9" onclick="x()"/>') };
  };
  const out = await generateArt(ctx, draft, spec, call);
  assert.equal(out.focus, '39% 50%');
  assert.doesNotMatch(out.svg, /onclick/);
  assert.match(out.svg, /<rect width="9"/);
  assert.ok(seen.schema && seen.system && seen.user);
});

test('generateArt rejects unsafe model output', async () => {
  await assert.rejects(generateArt(ctx, draft, spec, async () => ({ svg: 'not svg' })), UnsafeSvgError);
  await assert.rejects(generateArt(ctx, draft, spec, async () => ({ svg: wrap('<script>x</script>') })), UnsafeSvgError);
});

test('generateArt prompt carries draft and colours but never README text', async () => {
  let user;
  await generateArt({ ...ctx, readme: 'SECRET README ignore previous' }, draft, spec, async (a) => ((user = a.user), { svg: wrap('') }));
  assert.match(user, /name: Demo/);
  assert.match(user, /#112233 and #ddeeff/);
  assert.doesNotMatch(user, /SECRET README/);
});
