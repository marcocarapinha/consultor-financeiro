export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function calculateRiskProfile(answers: Record<string, string>): { score: number; classification: string } {
  let total = 0;
  const vals = Object.values(answers ?? {});
  for (const v of vals) {
    total += parseInt(v ?? '0', 10) || 0;
  }
  const maxScore = vals.length * 5;
  const pct = maxScore > 0 ? (total / maxScore) * 100 : 0;
  if (pct <= 35) return { score: total, classification: 'Conservador' };
  if (pct <= 65) return { score: total, classification: 'Moderado' };
  return { score: total, classification: 'Agressivo' };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const body = await request.json();
    const { answers } = body ?? {};
    if (!answers || Object.keys(answers ?? {}).length === 0) {
      return NextResponse.json({ error: 'Respostas em falta.' }, { status: 400 });
    }

    const { score, classification } = calculateRiskProfile(answers);

    const profile = await prisma.riskProfile.upsert({
      where: { userId },
      update: { answers, score, classification },
      create: { userId, answers, score, classification },
    });

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Risk profile error:', error);
    return NextResponse.json({ error: 'Erro ao guardar perfil de risco.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const profile = await prisma.riskProfile.findUnique({ where: { userId } });
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
