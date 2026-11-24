// Which browser checks run. The default is every check; the updater's runner asks for a
// reduced scope (`node tests/ci.mjs --scope=reduced --slug=<slug>`) because the full suite does
// not finish there in time. The reduced scope keeps the main page's checks in ALL's order (they
// depend on it), at two sizes, plus the new or changed work page and its index card and Mark.
const SLUG_RE = /^[a-z0-9-]+$/;

/** Reads --scope= and --slug= from argv; throws on anything unusable. */
export function parseScope(argv = []) {
  const get = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const scope = get('scope') ?? 'full';
  if (scope !== 'full' && scope !== 'reduced') throw new Error(`Unknown scope ${JSON.stringify(scope)}`);
  const slug = get('slug');
  if (scope === 'reduced' && !(typeof slug === 'string' && SLUG_RE.test(slug))) {
    throw new Error(`The reduced scope needs --slug=<slug> matching ${SLUG_RE}`);
  }
  if (scope === 'full' && slug !== undefined) throw new Error('--slug only applies to the reduced scope');
  return { scope, slug: scope === 'reduced' ? slug : undefined };
}

/** The query string the harness page reads; empty for the full scope, so its URL is unchanged. */
export function scopeQuery({ scope, slug }) {
  return scope === 'reduced' ? `&scope=reduced&slug=${encodeURIComponent(slug)}` : '';
}

const MAIN_SIZES = [[1440, 800], [393, 852]];
// The work page at a spread of widths: wide, laptop, tablet, phone, narrowest phone.
const PAGE_SIZES = [[1920, 1080], [1280, 650], [768, 1024], [393, 852], [320, 640]];

/** The runs of the reduced scope. `all` and `pageChecks` are tests/run.js's own lists. */
export function reducedRuns({ slug, all, pageChecks }) {
  if (!SLUG_RE.test(String(slug))) throw new Error(`Invalid slug ${JSON.stringify(slug)}`);
  return [
    ...MAIN_SIZES.map(([width, height]) => ({ width, height, src: '/', names: all })),
    ...PAGE_SIZES.map(([width, height]) => ({ width, height, src: `/work/${slug}.html`, names: pageChecks })),
    { width: 1440, height: 800, src: `/#work-${slug}`, names: ['deepLink'] },
    { width: 393, height: 852, src: `/#work-${slug}`, names: ['deepLink'] },
    ...[852, 1280].map((width) => ({ width, height: 800, src: '/', names: ['pickerLabels'] })),
  ];
}
