export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getMultipleQuotes } from '@/lib/yahoo-finance';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const assets = await prisma.portfolioAsset.findMany({ where: { userId } });
    if ((assets?.length ?? 0) === 0) {
      return NextResponse.json({ quotes: [], lastUpdated: new Date().toISOString() });
    }
    const tickers = [...new Set((assets ?? []).map((a: any) => a?.ticker).filter(Boolean))];
    const quotes = await getMultipleQuotes(tickers as string[]);
    return NextResponse.json({ quotes, lastUpdated: new Date().toISOString() });
  } catch (error: any) {
    console.error('Quotes error:', error);
    return NextResponse.json({ error: 'Erro ao obter cotações.' }, { status: 500 });
  }
}
