import yahooFinance from 'yahoo-finance2';

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
}

export async function getQuote(ticker: string): Promise<QuoteData> {
  try {
    const result: any = await yahooFinance.quote(ticker);
    return {
      ticker: result?.symbol ?? ticker,
      name: result?.shortName ?? result?.longName ?? ticker,
      price: result?.regularMarketPrice ?? 0,
      previousClose: result?.regularMarketPreviousClose ?? 0,
      change: result?.regularMarketChange ?? 0,
      changePercent: result?.regularMarketChangePercent ?? 0,
      currency: result?.currency ?? 'USD',
      marketState: result?.marketState ?? 'UNKNOWN',
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance',
    };
  } catch (error: any) {
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

export async function getMultipleQuotes(tickers: string[]): Promise<QuoteData[]> {
  const results = await Promise.allSettled(
    tickers.map((t: string) => getQuote(t))
  );
  return results.map((r: PromiseSettledResult<QuoteData>, i: number) =>
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
}

export async function validateTicker(ticker: string): Promise<{ valid: boolean; name: string | null }> {
  try {
    const result: any = await yahooFinance.quote(ticker);
    return { valid: true, name: result?.shortName ?? result?.longName ?? null };
  } catch {
    return { valid: false, name: null };
  }
}

export async function getHistoricalData(
  ticker: string,
  period1: string,
  period2?: string
): Promise<{ date: string; close: number }[]> {
  try {
    const result: any = await yahooFinance.historical(ticker, {
      period1,
      period2: period2 ?? new Date().toISOString().split('T')[0],
    });
    return (result ?? []).map((r: any) => ({
      date: new Date(r?.date).toISOString().split('T')[0],
      close: r?.close ?? 0,
    }));
  } catch {
    return [];
  }
}
