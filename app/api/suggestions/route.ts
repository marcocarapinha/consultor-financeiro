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

    const [profile, assets] = await Promise.all([
      prisma.riskProfile.findUnique({ where: { userId } }),
      prisma.portfolioAsset.findMany({ where: { userId } }),
    ]);

    const tickers = [...new Set((assets ?? []).map((a: any) => a.ticker).filter(Boolean))];
    let quotes: any[] = [];
    if (tickers.length > 0) {
      quotes = await getMultipleQuotes(tickers as string[]);
    }

    const portfolioSummary = (assets ?? []).map((a: any, i: number) => {
      const q = quotes.find((qq: any) => qq?.ticker === a?.ticker);
      return `${a?.name} (${a?.ticker}): ${a?.quantity} unidades a ${a?.avgPrice}€ médio, preço atual: ${q?.price ?? 'indisponível'}€`;
    }).join('\n');

    const prompt = `És um assistente financeiro em Português de Portugal. Analisa a seguinte carteira de investimentos e sugere 3-4 melhorias/oportunidades.

Perfil de risco: ${profile?.classification ?? 'Não definido'}

Carteira atual:
${portfolioSummary || 'Carteira vazia'}

Regras:
- Sugere ativos concretos com ticker
- Para cada sugestão: ativo, razão (diversificação, correlação, etc.), nível de risco, prós e contras
- Se for alto risco, sinaliza claramente
- NUNCA apresentes como certeza, apenas como opção a analisar
- Responde em JSON com este formato:
{
  "suggestions": [
    {
      "ticker": "TICKER",
      "name": "Nome do ativo",
      "reason": "Razão da sugestão",
      "riskLevel": "Baixo|Médio|Alto|Muito Alto",
      "pros": ["pro1", "pro2"],
      "cons": ["contra1", "contra2"],
      "assetClass": "Ações|ETF|Obrigações|Cripto|etc"
    }
  ],
  "summary": "Resumo geral da análise"
}
Responde com raw JSON apenas.`;

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('LLM error:', errText);
      return NextResponse.json({ error: 'Erro ao gerar sugestões.' }, { status: 500 });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { suggestions: [], summary: content }; }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Erro ao gerar sugestões.' }, { status: 500 });
  }
}
