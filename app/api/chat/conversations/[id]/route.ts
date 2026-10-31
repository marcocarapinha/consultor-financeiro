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

function notFound() {
  return new Response(JSON.stringify({ error: 'Conversa não encontrada.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/chat/conversations/[id] — histórico completo de mensagens da conversa.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const conversation = await withDbRetry(() =>
      prisma.chatConversation.findFirst({
        where: { id, userId },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      })
    );
    if (!conversation) return notFound();

    const messages = await withDbRetry(() =>
      prisma.chatMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
      })
    );

    return new Response(
      JSON.stringify({ conversation: { ...conversation, messageCount: messages.length }, messages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Get conversation error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PATCH /api/chat/conversations/[id] — renomeia a conversa.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const rl = rateLimit(request, 'chat-conv-patch', 60, 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json().catch(() => ({}));
    const rawTitle = body?.title;
    if (typeof rawTitle !== 'string' || !rawTitle.trim()) {
      return new Response(JSON.stringify({ error: 'Título inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const title = rawTitle.trim().slice(0, 120);

    const existing = await withDbRetry(() =>
      prisma.chatConversation.findFirst({ where: { id, userId }, select: { id: true } })
    );
    if (!existing) return notFound();

    const conversation = await withDbRetry(() =>
      prisma.chatConversation.update({
        where: { id },
        data: { title },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      })
    );

    return new Response(JSON.stringify({ conversation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Rename conversation error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/chat/conversations/[id] — elimina a conversa e as suas mensagens.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const existing = await withDbRetry(() =>
      prisma.chatConversation.findFirst({ where: { id, userId }, select: { id: true } })
    );
    if (!existing) return notFound();

    await withDbRetry(() => prisma.chatConversation.delete({ where: { id } }));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
