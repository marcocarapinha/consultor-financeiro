export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getMultipleQuotes } from '@/lib/yahoo-finance';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = (session.user as any)?.id;

    const rl = rateLimit(request, 'chat', 30, 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json();
    let { message, history, conversationId } = body ?? {};
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Mensagem em falta.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Limita o tamanho da mensagem para evitar abuso/custo excessivo.
    message = message.slice(0, 4000);

    // Modo com conversa persistida: valida a propriedade e carrega o histórico
    // a partir da base de dados (ignora o histórico enviado pelo cliente, para
    // que a conversa fique sincronizada entre dispositivos).
    let convId: string | null = null;
    let isFirstMessage = false;
    let convTitle = '';
    if (conversationId && typeof conversationId === 'string') {
      const conv = await withDbRetry(() =>
        prisma.chatConversation.findFirst({ where: { id: conversationId, userId }, select: { id: true, title: true } })
      );
      if (!conv) {
        return new Response(JSON.stringify({ error: 'Conversa não encontrada.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      convId = conv.id;
      convTitle = conv.title;
      const dbMsgs = await withDbRetry(() =>
        prisma.chatMessage.findMany({ where: { conversationId: convId }, orderBy: { createdAt: 'asc' }, take: 40 })
      );
      isFirstMessage = dbMsgs.length === 0;
      history = dbMsgs.slice(-10).map((m: any) => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m?.content === 'string' ? m.content.slice(0, 4000) : '',
      }));
    } else {
      // Normaliza e limita o histórico enviado pelo cliente (modo sem conversa).
      if (!Array.isArray(history)) history = [];
      history = history.slice(-10).map((m: any) => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m?.content === 'string' ? m.content.slice(0, 4000) : '',
      }));
    }

    // Save user message
    await prisma.chatMessage.create({ data: { userId, role: 'user', content: message, conversationId: convId } });

    // Atualiza a conversa: data de atividade e, na primeira mensagem, o título.
    if (convId) {
      const newTitle = isFirstMessage && (!convTitle || convTitle === 'Nova conversa')
        ? message.slice(0, 60)
        : undefined;
      await withDbRetry(() =>
        prisma.chatConversation.update({ where: { id: convId as string }, data: { updatedAt: new Date(), ...(newTitle ? { title: newTitle } : {}) } })
      ).catch(() => { /* best-effort */ });
    }

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
      ...history,
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
                    await prisma.chatMessage.create({ data: { userId, role: 'assistant', content: fullResponse, conversationId: convId } });
                    if (convId) {
                      await prisma.chatConversation.update({ where: { id: convId as string }, data: { updatedAt: new Date() } }).catch(() => {});
                    }
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
            await prisma.chatMessage.create({ data: { userId, role: 'assistant', content: fullResponse, conversationId: convId } });
            if (convId) {
              await prisma.chatConversation.update({ where: { id: convId as string }, data: { updatedAt: new Date() } }).catch(() => {});
            }
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
