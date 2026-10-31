'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Lock, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const invalidLink = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A password deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As passwords não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Não foi possível redefinir a password.');
        return;
      }
      toast.success('Password redefinida com sucesso. Inicie sessão.');
      router.replace('/login');
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
            <CardTitle className="text-xl">Nova Password</CardTitle>
            <CardDescription>Escolha uma nova password para a sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            {invalidLink ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <AlertCircle className="w-12 h-12 text-[hsl(0_84%_60%)]" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Este link de redefinição é inválido ou está incompleto. Solicite um novo link de
                  recuperação.
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full">Pedir novo link</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repita a password"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Redefinir password
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
