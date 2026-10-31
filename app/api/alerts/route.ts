export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getMultipleQuotes } from '@/lib/yahoo-finance';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

const VALID_TYPES = ['PRICE_ABOVE', 'PRICE_BELOW', 'GAIN_PCT', 'LOSS_PCT', 'LOSS_RECOVER'];

// Avalia um alerta face ao valor atual. Devolve { value, isMet, hasData }.
function evaluateAlert(
  alert: any,
  quote: any,
  holding: any
): { value: number | null; isMet: boolean; hasData: boolean } {
  const price = quote?.price ?? 0;
  const quoteError = !!quote?.error || !(price > 0);

  if (alert.type === 'PRICE_ABOVE' || alert.type === 'PRICE_BELOW') {
    if (quoteError) return { value: null, isMet: false, hasData: false };
    const isMet = alert.type === 'PRICE_ABOVE' ? price >= alert.threshold : price <= alert.threshold;
    return { value: price, isMet, hasData: true };
  }

  // GAIN_PCT / LOSS_PCT / LOSS_RECOVER — precisa do preço médio do ativo na carteira.
  const avg = holding?.avgPrice ?? 0;
  if (quoteError || !(avg > 0)) return { value: null, isMet: false, hasData: false };
  const pct = ((price - avg) / avg) * 100;
  let isMet: boolean;
  if (alert.type === 'GAIN_PCT') {
    isMet = pct >= alert.threshold;
  } else if (alert.type === 'LOSS_RECOVER') {
    // Perda recupera: dispara quando a perda encolhe até -X% ou melhor (pct >= -X).
    isMet = pct >= -alert.threshold;
  } else {
    // LOSS_PCT: dispara quando a perda chega a X% ou pior (pct <= -X).
    isMet = pct <= -alert.threshold;
  }
  return { value: pct, isMet, hasData: true };
}

// GET /api/alerts — lista e avalia os alertas do utilizador.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const [alerts, assets] = await Promise.all([
      withDbRetry(() => prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })),
      withDbRetry(() => prisma.portfolioAsset.findMany({ where: { userId } })),
    ]);

    if ((alerts?.length ?? 0) === 0) {
      return NextResponse.json({ alerts: [], triggeredCount: 0 });
    }

    const holdingByTicker: Record<string, any> = {};
    for (const a of assets ?? []) {
      if (a?.ticker && !holdingByTicker[a.ticker]) holdingByTicker[a.ticker] = a;
    }

    const tickers = [...new Set((alerts ?? []).map((a: any) => a.ticker).filter(Boolean))];
    const quotes = await getMultipleQuotes(tickers as string[]);
    const quoteMap: Record<string, any> = {};
    for (const q of quotes ?? []) {
      if (q?.ticker) quoteMap[q.ticker] = q;
    }

    const toMarkTriggered: string[] = [];
    const enriched = (alerts ?? []).map((alert: any) => {
      const quote = quoteMap[alert.ticker] ?? null;
      const holding = holdingByTicker[alert.ticker] ?? null;
      const { value, isMet, hasData } = evaluateAlert(alert, quote, holding);

      // Dispara apenas alertas ativos que ainda não estão disparados.
      const justTriggered = alert.active && !alert.triggered && isMet && hasData;
      if (justTriggered) toMarkTriggered.push(alert.id);

      return {
        id: alert.id,
        ticker: alert.ticker,
        name: alert.name ?? holding?.name ?? alert.ticker,
        type: alert.type,
        threshold: alert.threshold,
        active: alert.active,
        triggered: alert.triggered || justTriggered,
        triggeredAt: justTriggered ? new Date().toISOString() : alert.triggeredAt,
        note: alert.note ?? null,
        currentValue: value,
        currentPrice: quote?.price ?? null,
        currency: quote?.currency ?? holding?.currency ?? 'EUR',
        isMet: isMet && hasData,
        hasData,
        stale: !!quote?.stale,
        createdAt: alert.createdAt,
      };
    });

    // Persiste os alertas recém-disparados (best-effort).
    if (toMarkTriggered.length > 0) {
      const now = new Date();
      await Promise.all(
        enriched
          .filter((e: any) => toMarkTriggered.includes(e.id))
          .map((e: any) =>
            withDbRetry(() =>
              prisma.priceAlert.update({
                where: { id: e.id },
                data: { triggered: true, triggeredAt: now, lastValue: e.currentValue ?? undefined },
              })
            ).catch(() => { /* best-effort */ })
          )
      );
    } else {
      // Atualiza lastValue dos restantes (best-effort, não bloqueante).
      Promise.all(
        enriched
          .filter((e: any) => e.currentValue != null)
          .map((e: any) =>
            prisma.priceAlert
              .update({ where: { id: e.id }, data: { lastValue: e.currentValue } })
              .catch(() => {})
          )
      ).catch(() => {});
    }

    const triggeredCount = enriched.filter((e: any) => e.triggered && e.active).length;
    return NextResponse.json({ alerts: enriched, triggeredCount });
  } catch (error: any) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Erro ao carregar alertas.' }, { status: 500 });
  }
}

// POST /api/alerts — cria um novo alerta.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const rl = rateLimit(request, 'alerts-create', 30, 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json().catch(() => ({}));
    let { ticker, name, type, threshold, note } = body ?? {};

    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'Ticker em falta.' }, { status: 400 });
    }
    ticker = ticker.trim().toUpperCase().slice(0, 20);
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de alerta inválido.' }, { status: 400 });
    }
    const thr = Number(threshold);
    if (!Number.isFinite(thr) || thr <= 0) {
      return NextResponse.json({ error: 'Valor do alerta inválido.' }, { status: 400 });
    }
    name = typeof name === 'string' ? name.trim().slice(0, 120) : null;
    note = typeof note === 'string' ? note.trim().slice(0, 200) : null;

    const count = await withDbRetry(() => prisma.priceAlert.count({ where: { userId } }));
    if (count >= 100) {
      return NextResponse.json({ error: 'Limite de alertas atingido.' }, { status: 413 });
    }

    const alert = await withDbRetry(() =>
      prisma.priceAlert.create({
        data: { userId, ticker, name, type, threshold: thr, note },
      })
    );

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error: any) {
    console.error('Alerts POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar alerta.' }, { status: 500 });
  }
}
