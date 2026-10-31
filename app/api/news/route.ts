export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

async function fetchYahooJson(path: string): Promise<any | null> {
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try next host
    }
  }
  return null;
}

async function newsFor(query: string, count: number): Promise<any[]> {
  const d = await fetchYahooJson(
    `/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=${count}&quotesCount=0&enableFuzzyQuery=false`
  );
  return Array.isArray(d?.news) ? d.news : [];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    let tickers: string[] = [];
    try {
      const assets = await withDbRetry(() =>
        prisma.portfolioAsset.findMany({ where: { userId }, select: { ticker: true } })
      );
      tickers = [...new Set((assets ?? []).map((a: any) => a?.ticker).filter(Boolean))];
    } catch {
      tickers = [];
    }

    // Build a query list: the user's own tickers first, then broad market
    // indices as a fallback so there is always relevant market news.
    const queries = [...tickers.slice(0, 6), '^GSPC', '^IXIC', 'stock market'];

    const seen = new Set<string>();
    const items: any[] = [];
    for (const q of queries) {
      if (items.length >= 10) break;
      const news = await newsFor(q, 6);
      for (const n of news) {
        const link = n?.link;
        const title = n?.title;
        if (!link || !title || seen.has(link)) continue;
        seen.add(link);
        const thumb =
          n?.thumbnail?.resolutions?.[0]?.url ??
          n?.thumbnail?.resolutions?.find?.((r: any) => r?.url)?.url ??
          null;
        items.push({
          title,
          link,
          publisher: n?.publisher ?? '',
          providerPublishTime: n?.providerPublishTime ?? null,
          thumbnail: thumb,
          relatedTicker: Array.isArray(n?.relatedTickers) ? n.relatedTickers[0] ?? null : null,
        });
        if (items.length >= 12) break;
      }
    }

    return NextResponse.json({ news: items.slice(0, 10), lastUpdated: new Date().toISOString() });
  } catch (error: any) {
    console.error('News error:', error);
    return NextResponse.json({ error: 'Erro ao obter notícias.' }, { status: 500 });
  }
}
