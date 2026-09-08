export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getHistoricalData, getMultipleQuotes } from '@/lib/yahoo-finance';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? '1M';

    const assets = await prisma.portfolioAsset.findMany({ where: { userId } });
    if ((assets?.length ?? 0) === 0) {
      return NextResponse.json({ history: [] });
    }

    let period1 = new Date();
    switch (period) {
      case '1D': period1.setDate(period1.getDate() - 2); break;
      case '1M': period1.setMonth(period1.getMonth() - 1); break;
      case '3M': period1.setMonth(period1.getMonth() - 3); break;
      case '6M': period1.setMonth(period1.getMonth() - 6); break;
      case '1A': period1.setFullYear(period1.getFullYear() - 1); break;
      default: period1.setFullYear(period1.getFullYear() - 5); break;
    }

    const tickers = [...new Set((assets ?? []).map((a: any) => a.ticker).filter(Boolean))];
    const historicals = await Promise.all(
      tickers.map((t: string) => getHistoricalData(t, period1.toISOString().split('T')[0]))
    );

    const dateMap: Record<string, number> = {};
    tickers.forEach((ticker: string, i: number) => {
      const asset = assets.find((a: any) => a.ticker === ticker);
      const qty = asset?.quantity ?? 0;
      const hist = historicals[i] ?? [];
      for (const h of hist) {
        const d = h?.date ?? '';
        if (!dateMap[d]) dateMap[d] = 0;
        dateMap[d] += (h?.close ?? 0) * qty;
      }
    });

    const history = Object.entries(dateMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('History error:', error);
    return NextResponse.json({ error: 'Erro ao obter histórico.' }, { status: 500 });
  }
}
