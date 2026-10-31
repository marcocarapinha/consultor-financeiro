'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Ocorreu um erro. Tente novamente.');
        return;
      }
      setSent(true);
    } catch {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">InvestAssist</h1>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Recuperar Password</CardTitle>
            <CardDescription>
              {sent
                ? 'Verifique a sua caixa de correio'
                : 'Indique o seu email para receber o link de redefinição'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-12 h-12 text-[hsl(142_71%_45%)]" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Se existir uma conta associada a <strong>{email}</strong>, enviámos um email com
                  instruções para redefinir a password. O link é válido durante 1 hora.
                </p>
                <p className="text-xs text-muted-foreground">
                  Não recebeu? Verifique a pasta de spam ou tente novamente.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                  Enviar novamente
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enviar link de recuperação
                </Button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground mt-4">
              <Link href="/login" className="text-primary hover:underline font-medium">
                Voltar ao início de sessão
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
