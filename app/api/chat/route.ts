export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMultipleQuotes } from '@/lib/yahoo-finance';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const { message, history } = body ?? {};
    if (!message) {
      return new Response(JSON.stringify({ error: 'Mensagem em falta.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Save user message
    await prisma.chatMessage.create({ data: { userId, role: 'user', content: message } });

    // Get portfolio context
    const [profile, assets] = await Promise.all([
      prisma.riskProfile.findUnique({ where: { userId } }),
      prisma.portfolioAsset.findMany({ where: { userId } }),
    ]);

    const tickers = [...new Set((assets ?? []).map((a: any) => a.ticker).filter(Boolean))];
    let quotes: any[] = [];
    if (tickers.length > 0) {
      quotes = await getMultipleQuotes(tickers as string[]);
    }

    const portfolioContext = (assets ?? []).map((a: any) => {
      const q = quotes.find((qq: any) => qq?.ticker === a?.ticker);
      return `${a?.name} (${a?.ticker}): ${a?.quantity} un. @ ${a?.avgPrice}€, atual: ${q?.price ?? '?'}€, var: ${q?.changePercent?.toFixed?.(2) ?? '?'}%`;
    }).join('\n');

    const systemPrompt = `És o InvestAssist, um assistente financeiro em Português de Portugal. Tens acesso à carteira do utilizador.

Perfil de risco: ${profile?.classification ?? 'Não definido'}

Carteira atual:
${portfolioContext || 'Carteira vazia - o utilizador ainda não adicionou ativos.'}

Regras importantes:
- Responde SEMPRE em Português de Portugal
- NUNCA executes ordens de compra ou venda
- NUNCA solicites credenciais bancárias
- NUNCA apresentes informação como certeza absoluta
- Inclui sempre a ressalva que não é aconselhamento financeiro certificado
- Sê direto, profissional e útil
- Se não souberes algo, diz que não sabes`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...((history ?? []).slice(-10).map((m: any) => ({ role: m?.role ?? 'user', content: m?.content ?? '' }))),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        stream: true,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Chat LLM error:', errText);
      return new Response(JSON.stringify({ error: 'Erro ao contactar o assistente.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let fullResponse = '';
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let partialRead = '';
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Save assistant response
                  if (fullResponse) {
                    await prisma.chatMessage.create({ data: { userId, role: 'assistant', content: fullResponse } });
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content ?? '';
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch { /* skip invalid */ }
              }
            }
          }
          if (fullResponse) {
            await prisma.chatMessage.create({ data: { userId, role: 'assistant', content: fullResponse } });
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
