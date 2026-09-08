export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMultipleQuotes } from '@/lib/yahoo-finance';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const assets = await prisma.portfolioAsset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if ((assets?.length ?? 0) === 0) {
      return NextResponse.json({ assets: [], totalValue: 0, dailyChange: 0, dailyChangePercent: 0, quotes: {} });
    }

    const tickers = [...new Set((assets ?? []).map((a: any) => a.ticker).filter(Boolean))];
    const quotes = await getMultipleQuotes(tickers as string[]);
    const quoteMap: Record<string, any> = {};
    for (const q of (quotes ?? [])) {
      if (q?.ticker) quoteMap[q.ticker] = q;
    }

    let totalValue = 0;
    let totalCost = 0;
    let dailyChange = 0;

    const enriched = (assets ?? []).map((a: any) => {
      const q = quoteMap[a?.ticker] ?? null;
      const currentPrice = q?.price ?? 0;
      const previousClose = q?.previousClose ?? currentPrice;
      const value = currentPrice * (a?.quantity ?? 0);
      const cost = (a?.avgPrice ?? 0) * (a?.quantity ?? 0);
      const dayChange = (currentPrice - previousClose) * (a?.quantity ?? 0);
      const totalGain = value - cost;

      totalValue += value;
      totalCost += cost;
      dailyChange += dayChange;

      return {
        ...a,
        currentPrice,
        value,
        cost,
        dayChange,
        dayChangePercent: previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
        totalGain,
        totalGainPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        weight: 0,
        quote: q,
      };
    });

    for (const a of enriched) {
      a.weight = totalValue > 0 ? (a.value / totalValue) * 100 : 0;
    }

    const dailyChangePercent = totalCost > 0 ? (dailyChange / totalValue) * 100 : 0;

    return NextResponse.json({
      assets: enriched,
      totalValue,
      totalCost,
      dailyChange,
      dailyChangePercent,
      quotes: quoteMap,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Portfolio error:', error);
    return NextResponse.json({ error: 'Erro ao carregar carteira.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const { assets: newAssets } = body ?? {};
    if (!newAssets || !Array.isArray(newAssets) || newAssets.length === 0) {
      return NextResponse.json({ error: 'Dados de ativos em falta.' }, { status: 400 });
    }

    const created = [];
    for (const a of newAssets) {
      const asset = await prisma.portfolioAsset.create({
        data: {
          userId,
          name: a?.name ?? '',
          ticker: (a?.ticker ?? '').toUpperCase(),
          quantity: parseFloat(a?.quantity ?? '0') || 0,
          avgPrice: parseFloat(a?.avgPrice ?? '0') || 0,
          currency: a?.currency ?? 'EUR',
          purchaseDate: a?.purchaseDate ? new Date(a.purchaseDate) : null,
          broker: a?.broker ?? null,
          sector: a?.sector ?? null,
          assetClass: a?.assetClass ?? null,
        },
      });
      created.push(asset);
    }

    return NextResponse.json({ assets: created }, { status: 201 });
  } catch (error: any) {
    console.error('Portfolio create error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar ativos.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('id');
    if (!assetId) return NextResponse.json({ error: 'ID do ativo em falta.' }, { status: 400 });

    const asset = await prisma.portfolioAsset.findFirst({ where: { id: assetId, userId } });
    if (!asset) return NextResponse.json({ error: 'Ativo não encontrado.' }, { status: 404 });

    await prisma.portfolioAsset.delete({ where: { id: assetId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao remover ativo.' }, { status: 500 });
  }
}
