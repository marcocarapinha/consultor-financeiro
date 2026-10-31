export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/chat/conversations — lista as conversas do utilizador autenticado.
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const userId = (session.user as any)?.id;

    const conversations = await withDbRetry(() =>
      prisma.chatConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      })
    );

    const result = conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count?.messages ?? 0,
    }));

    return new Response(JSON.stringify({ conversations: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('List conversations error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/chat/conversations — cria uma nova conversa.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const userId = (session.user as any)?.id;

    const rl = rateLimit(request, 'chat-conv-create', 30, 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    let title = 'Nova conversa';
    try {
      const body = await request.json();
      if (body && typeof body.title === 'string' && body.title.trim()) {
        title = body.title.trim().slice(0, 120);
      }
    } catch {
      // corpo opcional
    }

    const conversation = await withDbRetry(() =>
      prisma.chatConversation.create({
        data: { userId, title },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      })
    );

    return new Response(
      JSON.stringify({ conversation: { ...conversation, messageCount: 0 } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
