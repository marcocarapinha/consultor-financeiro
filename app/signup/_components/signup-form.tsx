'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Mail, Lock, User, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { GoogleIcon } from '@/components/google-icon';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { redirectTo: '/dashboard' });
    } catch {
      toast.error('Ocorreu um erro ao criar conta com o Google.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A password deve ter pelo menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao criar conta.');
        return;
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        toast.error('Conta criada. Inicie sessão manualmente.');
        router.push('/login');
      } else {
        router.replace('/onboarding');
      }
    } catch {
      toast.error('Erro ao criar conta. Tente novamente.');
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
            <CardTitle className="text-xl">Criar Conta</CardTitle>
            <CardDescription>Comece a gerir a sua carteira de investimentos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <GoogleIcon className="w-4 h-4 mr-2" />
              )}
              Continuar com Google
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="O seu nome"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Conta
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem conta?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">Iniciar sessão</Link>
            </p>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Ao criar conta, aceita a nossa{' '}
              <Link href="/privacy" className="hover:underline">Política de Privacidade</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
