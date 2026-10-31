export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// PATCH /api/alerts/[id] — ativar/pausar, reativar (reset do disparo) ou editar.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const existing = await withDbRetry(() =>
      prisma.priceAlert.findFirst({ where: { id, userId }, select: { id: true } })
    );
    if (!existing) return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: any = {};

    if (typeof body.active === 'boolean') data.active = body.active;
    // reset: reativa o alerta limpando o estado de disparo.
    if (body.reset === true) {
      data.triggered = false;
      data.triggeredAt = null;
      data.active = true;
    }
    if (body.type !== undefined) {
      const ALLOWED = ['PRICE_ABOVE', 'PRICE_BELOW', 'GAIN_PCT', 'LOSS_PCT', 'LOSS_RECOVER'];
      if (!ALLOWED.includes(body.type)) {
        return NextResponse.json({ error: 'Tipo de alerta inválido.' }, { status: 400 });
      }
      data.type = body.type;
      // ao alterar a condição, limpa o disparo para reavaliar.
      data.triggered = false;
      data.triggeredAt = null;
    }
    if (body.threshold !== undefined) {
      const thr = Number(body.threshold);
      if (!Number.isFinite(thr) || thr <= 0) {
        return NextResponse.json({ error: 'Valor do alerta inválido.' }, { status: 400 });
      }
      data.threshold = thr;
      // ao alterar o limiar, limpa o disparo para reavaliar.
      data.triggered = false;
      data.triggeredAt = null;
    }
    if (typeof body.note === 'string') data.note = body.note.trim().slice(0, 200);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
    }

    const alert = await withDbRetry(() => prisma.priceAlert.update({ where: { id }, data }));
    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('Alerts PATCH error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar alerta.' }, { status: 500 });
  }
}

// DELETE /api/alerts/[id] — elimina o alerta.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { id } = await params;

    const existing = await withDbRetry(() =>
      prisma.priceAlert.findFirst({ where: { id, userId }, select: { id: true } })
    );
    if (!existing) return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });

    await withDbRetry(() => prisma.priceAlert.delete({ where: { id } }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Alerts DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao eliminar alerta.' }, { status: 500 });
  }
}
