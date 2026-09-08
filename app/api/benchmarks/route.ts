export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getMultipleQuotes, getHistoricalData } from '@/lib/yahoo-finance';

const BENCHMARKS = [
  { ticker: '^GSPC', name: 'S&P 500' },
  { ticker: '^STOXX50E', name: 'Eurostoxx 50' },
  { ticker: 'PSI20.LS', name: 'PSI-20' },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? '1M';

    const quotes = await getMultipleQuotes(BENCHMARKS.map((b: any) => b.ticker));

    let period1 = new Date();
    switch (period) {
      case '1D': period1.setDate(period1.getDate() - 2); break;
      case '1M': period1.setMonth(period1.getMonth() - 1); break;
      case '3M': period1.setMonth(period1.getMonth() - 3); break;
      case '6M': period1.setMonth(period1.getMonth() - 6); break;
      case '1A': period1.setFullYear(period1.getFullYear() - 1); break;
      default: period1.setFullYear(period1.getFullYear() - 5); break;
    }

    const historicalPromises = BENCHMARKS.map((b: any) =>
      getHistoricalData(b.ticker, period1.toISOString().split('T')[0])
    );
    const historicals = await Promise.all(historicalPromises);

    const result = BENCHMARKS.map((b: any, i: number) => ({
      ...b,
      quote: quotes?.[i] ?? null,
      historical: historicals?.[i] ?? [],
    }));

    return NextResponse.json({ benchmarks: result });
  } catch (error: any) {
    console.error('Benchmarks error:', error);
    return NextResponse.json({ error: 'Erro ao obter benchmarks.' }, { status: 500 });
  }
}
