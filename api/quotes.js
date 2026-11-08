// Delayed index quotes for the ticker strip (js/ticker.js), as a Vercel
// function so the browser never calls the data source itself (it sends no
// CORS headers, and limits by address). Quotes come from Yahoo Finance's
// public chart endpoint, which is unofficial and may be a few minutes
// behind, so the page labels them delayed. A symbol that fails is left out:
// the strip shows only numbers that were really fetched.
//
// The response is cached at the edge for a minute, so a traffic spike makes
// one upstream request a minute per symbol, not one per visitor.

const SYMBOLS = [
  { sym: 'STI', yahoo: '^STI', label: 'STI', currency: 'SGD' },
  { sym: 'VIX', yahoo: '^VIX', label: 'VIX', currency: '' },
  { sym: 'BTC', yahoo: 'BTC-USD', label: 'BTC', currency: 'USD' },
];

async function quote({ sym, yahoo, label, currency }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=5d`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; portfolio-ticker)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`${yahoo}: ${response.status}`);
  const meta = (await response.json())?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const pct = meta?.regularMarketChangePercent;
  if (!Number.isFinite(price)) throw new Error(`${yahoo}: no price`);
  return {
    sym,
    label,
    currency,
    price,
    pct: Number.isFinite(pct) ? pct : null,
    asOf: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
  };
}

export default async function handler(request, response) {
  const settled = await Promise.allSettled(SYMBOLS.map(quote));
  const quotes = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  response.status(quotes.length ? 200 : 502).json({ quotes });
}
