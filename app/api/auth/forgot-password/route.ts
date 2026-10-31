export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, 'forgot-password', 5, 15 * 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const body = await request.json();
    const { email } = body ?? {};
    if (!email || typeof email !== 'string' || email.length > 254) {
      return NextResponse.json({ error: 'O email é obrigatório.' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Resposta genérica para não revelar se o email existe.
    const genericResponse = NextResponse.json({
      message: 'Se existir uma conta com este email, enviámos instruções para redefinir a password.',
    });

    if (!user) {
      return genericResponse;
    }

    // Gera um token seguro e guarda apenas o seu hash na base de dados.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Remove tokens anteriores deste utilizador.
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token: tokenHash, expires },
    });

    const appUrl = process.env.NEXTAUTH_URL || '';
    const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'InvestAssist';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
        <div style="background: #0a0f1e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">InvestAssist</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a1a2e; margin-top: 0;">Redefinir a sua password</h2>
          <p>Olá ${user.name || ''},</p>
          <p>Recebemos um pedido para redefinir a password da sua conta. Clique no botão abaixo para escolher uma nova password. Este link é válido durante <strong>1 hora</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Password</a>
          </div>
          <p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este endereço no seu navegador:</p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 13px; color: #666;">Se não solicitou esta alteração, pode ignorar este email — a sua password permanecerá inalterada.</p>
        </div>
      </div>
    `;

    try {
      const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.WEB_APP_ID,
          notification_id: process.env.NOTIF_ID_RECUPERAO_DE_PASSWORD,
          subject: 'Redefinição de password — InvestAssist',
          body: htmlBody,
          is_html: true,
          recipient_email: normalizedEmail,
          sender_email: appUrl ? `noreply@${new URL(appUrl).hostname}` : undefined,
          sender_alias: appName,
        }),
      });
      const result = await response.json();
      if (!result.success && !result.notification_disabled) {
        console.error('Falha ao enviar email de recuperação:', result.message);
      }
    } catch (mailError) {
      console.error('Erro no envio do email de recuperação:', mailError);
    }

    return genericResponse;
  } catch (error) {
    console.error('Forgot-password error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
