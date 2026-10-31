export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, 'reset-password', 10, 15 * 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json();
    const { token, email, password } = body ?? {};
    if (!token || !email || !password || typeof token !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'A password deve ter entre 8 e 72 caracteres.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token as string).digest('hex');

    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: normalizedEmail, token: tokenHash } },
    });

    if (!record) {
      return NextResponse.json({ error: 'Link inválido ou já utilizado. Solicite um novo.' }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
      return NextResponse.json({ error: 'Este link expirou. Solicite um novo.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword },
    });

    // Invalida o token após uso.
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });

    return NextResponse.json({ message: 'Password redefinida com sucesso.' });
  } catch (error) {
    console.error('Reset-password error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
