export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, 'signup', 10, 10 * 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json();
    const { email, password, name } = body ?? {};
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'A password deve ter entre 8 e 72 caracteres.' }, { status: 400 });
    }
    if (email.length > 254 || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Este email já está registado.' }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashedPassword, name: (name as string).trim() },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 });
  }
}
