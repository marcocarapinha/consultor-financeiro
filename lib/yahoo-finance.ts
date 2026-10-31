import YahooFinance from 'yahoo-finance2';
import { prisma, withDbRetry } from './prisma';

// yahoo-finance2 v4 requires instantiation. Kept only as a secondary fallback
// because its quote()/search() endpoints depend on a "crumb" token that Yahoo
// frequently rate-limits (HTTP 429 "Failed to get crumb") from datacenter IPs,
// which caused every quote to fall back to price 0 in production.
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
});

export interface QuoteData {
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  lastUpdated: string;
  source: string;
  error?: string;
  // true when the live fetch failed and this price comes from the last
  // successfully cached quote (so the dashboard shows the last known value
  // instead of 0).
  stale?: boolean;
}

// The v8 chart and v1 search endpoints do NOT require a crumb/cookie, so they
// keep working from cloud/datacenter IPs where the crumb-based quote() endpoint
// gets blocked. We hit these directly and only use the library as a fallback.
const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fetchYahooJson(path: string): Promise<any | null> {
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        // Avoid Next.js caching a stale price.
        cache: 'no-store',
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try the next host
    }
  }
  return null;
}

// Cache resolved symbols (e.g. "JMT" -> "JMT.LS") for the process lifetime
// so we only hit the search endpoint once per bare ticker. `null` is cached
// for tickers the quote source does not know at all.
const symbolCache = new Map<string, string | null>();

// Many European/non-US tickers require an exchange suffix (e.g. Euronext
// Lisboa "JMT" must be queried as "JMT.LS", Xetra "SXRV" as "SXRV.DE"). When a
// bare ticker returns no price, resolve the correct symbol via Yahoo's
// (crumb-free) search endpoint. The search can return several listings of the
// same instrument across exchanges, not all of which carry a live price, so we
// pick the first candidate that actually returns one. Returns `null` when the
// ticker is not found in the quote source at all.
async function resolveSymbol(ticker: string): Promise<string | null> {
  const key = ticker.toUpperCase();
  if (symbolCache.has(key)) return symbolCache.get(key)!;
  const j = await fetchYahooJson(
    `/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=10&newsCount=0`
  );
  const candidates: string[] = (j?.quotes ?? [])
    .map((q: any) => q?.symbol)
    .filter((s: any): s is string => !!s);
  if (candidates.length === 0) {
    symbolCache.set(key, null); // genuinely unknown ticker
    return null;
  }
  // Prefer a candidate that actually returns a live price.
  for (const cand of candidates) {
    if (cand.toUpperCase() === key) continue; // the bare symbol already failed
    const chart = await fetchChart(cand, { range: '1d' });
    if (chart?.meta?.regularMarketPrice) {
      symbolCache.set(key, cand);
      return cand;
    }
  }
  // None had a live price; fall back to the first candidate so downstream
  // history/validation can still try it.
  symbolCache.set(key, candidates[0]);
  return candidates[0];
}

interface ChartData {
  meta: any;
  closes: { date: string; close: number }[];
}

// Fetch the v8 chart for a symbol. `range`/`interval` cover live-price lookups;
// `period1`/`period2` (unix seconds) cover historical series.
async function fetchChart(
  sym: string,
  opts: { range?: string; interval?: string; period1?: number; period2?: number }
): Promise<ChartData | null> {
  const interval = opts.interval ?? '1d';
  let qs = `interval=${interval}`;
  if (opts.period1 != null) {
    qs += `&period1=${opts.period1}&period2=${opts.period2 ?? Math.floor(Date.now() / 1000)}`;
  } else {
    qs += `&range=${opts.range ?? '1d'}`;
  }
  const j = await fetchYahooJson(`/v8/finance/chart/${encodeURIComponent(sym)}?${qs}`);
  const result = j?.chart?.result?.[0];
  if (!result?.meta) return null;
  const ts: number[] = result.timestamp ?? [];
  const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const adjClose: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const closes = ts
    .map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      close: rawCloses[i] ?? adjClose[i] ?? null,
    }))
    .filter((r) => r.close != null) as { date: string; close: number }[];
  return { meta: result.meta, closes };
}

function buildQuoteFromChart(ticker: string, chart: ChartData): QuoteData {
  const m = chart.meta ?? {};
  const price =
    m.regularMarketPrice ??
    (chart.closes.length ? chart.closes[chart.closes.length - 1].close : 0);
  // With range=1d, chartPreviousClose is the prior trading-day close (the right
  // baseline for "daily change"). Fall back to the series or the live field.
  const previousClose =
    m.chartPreviousClose ??
    m.previousClose ??
    m.regularMarketPreviousClose ??
    (chart.closes.length >= 2 ? chart.closes[chart.closes.length - 2].close : price);
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  return {
    ticker,
    name: m.shortName ?? m.longName ?? ticker,
    price: price ?? 0,
    previousClose: previousClose ?? 0,
    change,
    changePercent,
    currency: m.currency ?? 'USD',
    marketState: m.marketState ?? 'UNKNOWN',
    lastUpdated: new Date().toISOString(),
    source: 'Yahoo Finance',
  };
}

export async function getQuote(ticker: string): Promise<QuoteData> {
  try {
    // Primary: crumb-free chart endpoint (range=1d gives live price + prev close).
    let chart = await fetchChart(ticker, { range: '1d' });
    let notFound = false;
    if (!chart?.meta?.regularMarketPrice) {
      const resolved = await resolveSymbol(ticker);
      if (!resolved) {
        notFound = true;
      } else if (resolved.toUpperCase() !== ticker.toUpperCase()) {
        const alt = await fetchChart(resolved, { range: '1d' });
        if (alt?.meta?.regularMarketPrice) chart = alt;
      }
    }
    if (chart?.meta?.regularMarketPrice) {
      return buildQuoteFromChart(ticker, chart);
    }

    // Secondary fallback: the library quote() (may fail with a crumb 429).
    try {
      const result: any = await yahooFinance.quote(ticker);
      if (result?.regularMarketPrice) {
        return {
          ticker,
          name: result?.shortName ?? result?.longName ?? ticker,
          price: result.regularMarketPrice,
          previousClose: result?.regularMarketPreviousClose ?? result.regularMarketPrice,
          change: result?.regularMarketChange ?? 0,
          changePercent: result?.regularMarketChangePercent ?? 0,
          currency: result?.currency ?? 'USD',
          marketState: result?.marketState ?? 'UNKNOWN',
          lastUpdated: new Date().toISOString(),
          source: 'Yahoo Finance',
        };
      }
    } catch {
      // fall through
    }

    console.warn(`[yahoo-finance] No price for ${ticker} (chart + library both empty).`);
    return {
      ticker,
      name: ticker,
      price: 0,
      previousClose: 0,
      change: 0,
      changePercent: 0,
      currency: 'USD',
      marketState: 'UNKNOWN',
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance',
      error: notFound
        ? 'Símbolo não encontrado. Confirme o ticker (pode precisar do sufixo da bolsa, ex.: .LS, .DE, .L).'
        : 'Cotação indisponível de momento.',
    };
  } catch (error: any) {
    console.warn(`[yahoo-finance] getQuote(${ticker}) failed:`, error?.message ?? error);
    return {
      ticker,
      name: ticker,
      price: 0,
      previousClose: 0,
      change: 0,
      changePercent: 0,
      currency: 'USD',
      marketState: 'UNKNOWN',
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance',
      error: `Cotação indisponível: ${error?.message ?? 'Erro desconhecido'}`,
    };
  }
}

// Persist a successful quote so it can be served if a later live fetch fails.
async function cacheGoodQuotes(quotes: QuoteData[]): Promise<void> {
  const good = quotes.filter((q) => q.price > 0 && !q.error);
  if (good.length === 0) return;
  try {
    await withDbRetry(() =>
      prisma.$transaction(
        good.map((q) =>
          prisma.quoteCache.upsert({
            where: { ticker: q.ticker },
            create: {
              ticker: q.ticker,
              name: q.name,
              price: q.price,
              previousClose: q.previousClose,
              currency: q.currency,
            },
            update: {
              name: q.name,
              price: q.price,
              previousClose: q.previousClose,
              currency: q.currency,
            },
          })
        )
      )
    );
  } catch {
    // Caching is best-effort; never let it break the live response.
  }
}

// For any quote that failed (price 0 / error), substitute the last cached value.
async function fillFromCache(quotes: QuoteData[]): Promise<void> {
  const bad = quotes.filter((q) => !(q.price > 0) || q.error);
  if (bad.length === 0) return;
  try {
    const cached = await withDbRetry(() =>
      prisma.quoteCache.findMany({
        where: { ticker: { in: bad.map((b) => b.ticker) } },
      })
    );
    const map = new Map(cached.map((c: any) => [c.ticker, c]));
    for (const q of bad) {
      const c: any = map.get(q.ticker);
      if (!c) continue;
      q.price = c.price;
      q.previousClose = c.previousClose;
      q.currency = c.currency ?? q.currency;
      q.name = c.name ?? q.name;
      q.change = q.price - q.previousClose;
      q.changePercent = q.previousClose > 0 ? (q.change / q.previousClose) * 100 : 0;
      q.lastUpdated = new Date(c.updatedAt).toISOString();
      q.source = 'Última cotação guardada';
      q.stale = true;
      q.error = undefined;
    }
  } catch {
    // Cache unavailable; leave the failed quotes as they are.
  }
}

export async function getMultipleQuotes(tickers: string[]): Promise<QuoteData[]> {
  const results = await Promise.allSettled(tickers.map((t: string) => getQuote(t)));
  const quotes: QuoteData[] = results.map((r: PromiseSettledResult<QuoteData>, i: number) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          ticker: tickers[i] ?? 'UNKNOWN',
          name: tickers[i] ?? 'UNKNOWN',
          price: 0,
          previousClose: 0,
          change: 0,
          changePercent: 0,
          currency: 'USD',
          marketState: 'UNKNOWN',
          lastUpdated: new Date().toISOString(),
          source: 'Yahoo Finance',
          error: 'Cotação indisponível',
        }
  );
  // Save the good ones and backfill the failed ones from the cache.
  await cacheGoodQuotes(quotes);
  await fillFromCache(quotes);
  return quotes;
}

export async function validateTicker(
  ticker: string
): Promise<{ valid: boolean; name: string | null }> {
  // Use the crumb-free chart endpoint; resolve the exchange symbol if needed.
  let chart = await fetchChart(ticker, { range: '1d' });
  if (!chart?.meta?.regularMarketPrice) {
    const resolved = await resolveSymbol(ticker);
    if (resolved && resolved.toUpperCase() !== ticker.toUpperCase()) {
      const alt = await fetchChart(resolved, { range: '1d' });
      if (alt?.meta?.regularMarketPrice) chart = alt;
    }
  }
  if (chart?.meta?.regularMarketPrice) {
    return { valid: true, name: chart.meta.shortName ?? chart.meta.longName ?? null };
  }
  return { valid: false, name: null };
}

export async function getHistoricalData(
  ticker: string,
  period1: string,
  period2?: string
): Promise<{ date: string; close: number }[]> {
  const p1 = Math.floor(new Date(period1).getTime() / 1000);
  const p2 = Math.floor(new Date(period2 ?? new Date().toISOString()).getTime() / 1000);
  const fetchRows = async (sym: string) => {
    const chart = await fetchChart(sym, { period1: p1, period2: p2, interval: '1d' });
    return chart?.closes ?? [];
  };
  try {
    let rows = await fetchRows(ticker);
    if (rows.length === 0) {
      const resolved = await resolveSymbol(ticker);
      if (resolved && resolved.toUpperCase() !== ticker.toUpperCase()) {
        rows = await fetchRows(resolved);
      }
    }
    return rows;
  } catch {
    return [];
  }
}
