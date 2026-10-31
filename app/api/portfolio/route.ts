export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getMultipleQuotes } from '@/lib/yahoo-finance';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const assets = await withDbRetry(() =>
      prisma.portfolioAsset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    );

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
    if (newAssets.length > 500) {
      return NextResponse.json({ error: 'Demasiados ativos num único pedido (máximo 500).' }, { status: 413 });
    }

    const cap = (v: any, n: number) => (typeof v === 'string' ? v.slice(0, n) : v);
    const created = [];
    for (const a of newAssets) {
      const asset = await prisma.portfolioAsset.create({
        data: {
          userId,
          name: cap(a?.name, 120) ?? '',
          ticker: cap((a?.ticker ?? '').toUpperCase(), 20),
          quantity: parseFloat(a?.quantity ?? '0') || 0,
          avgPrice: parseFloat(a?.avgPrice ?? '0') || 0,
          currency: cap(a?.currency ?? 'EUR', 10),
          purchaseDate: a?.purchaseDate ? new Date(a.purchaseDate) : null,
          broker: cap(a?.broker, 120) ?? null,
          sector: cap(a?.sector, 80) ?? null,
          assetClass: cap(a?.assetClass, 80) ?? null,
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

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const { id, ...fields } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID do ativo em falta.' }, { status: 400 });

    const existing = await prisma.portfolioAsset.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: 'Ativo não encontrado.' }, { status: 404 });

    const cap = (v: any, n: number) => (typeof v === 'string' ? v.slice(0, n) : v);
    const data: any = {};
    if (fields.name !== undefined) data.name = cap(fields.name, 120) ?? '';
    if (fields.ticker !== undefined) data.ticker = cap((fields.ticker ?? '').toUpperCase(), 20);
    if (fields.quantity !== undefined) data.quantity = parseFloat(fields.quantity) || 0;
    if (fields.avgPrice !== undefined) data.avgPrice = parseFloat(fields.avgPrice) || 0;
    if (fields.currency !== undefined) data.currency = cap(fields.currency ?? 'EUR', 10);
    if (fields.purchaseDate !== undefined) data.purchaseDate = fields.purchaseDate ? new Date(fields.purchaseDate) : null;
    if (fields.broker !== undefined) data.broker = cap(fields.broker, 120) || null;
    if (fields.sector !== undefined) data.sector = cap(fields.sector, 80) || null;
    if (fields.assetClass !== undefined) data.assetClass = cap(fields.assetClass, 80) || null;

    const updated = await prisma.portfolioAsset.update({ where: { id }, data });
    return NextResponse.json({ asset: updated });
  } catch (error: any) {
    console.error('Portfolio update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar ativo.' }, { status: 500 });
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
