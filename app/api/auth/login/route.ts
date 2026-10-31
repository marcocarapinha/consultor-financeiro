export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, 'login', 10, 5 * 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json();
    const { email, password } = body ?? {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 72) {
      return NextResponse.json({ error: 'Email e password são obrigatórios.' }, { status: 400 });
    }
    const normalizedEmail = (email as string).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.password) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
