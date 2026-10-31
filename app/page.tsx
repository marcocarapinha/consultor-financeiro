import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingUp, LineChart, Bot, ShieldCheck, PieChart } from 'lucide-react';

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  const currentYear = 2026;

  const features = [
    {
      icon: LineChart,
      title: 'Cotações em tempo real',
      description:
        'Acompanhe o desempenho da sua carteira com cotações de mercado atualizadas e gráficos históricos.',
    },
    {
      icon: Bot,
      title: 'Sugestões com IA',
      description:
        'Receba análises e sugestões personalizadas geradas por inteligência artificial, adaptadas ao seu perfil de risco.',
    },
    {
      icon: PieChart,
      title: 'Gestão de carteira',
      description:
        'Registe os seus ativos, visualize a alocação e compare o desempenho com índices de referência.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight">InvestAssist</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Iniciar sessão</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight max-w-3xl mx-auto">
            A sua carteira de investimentos, sempre sob controlo
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            O InvestAssist ajuda-o a acompanhar os seus investimentos, com cotações em tempo real,
            relatórios de desempenho e sugestões personalizadas com inteligência artificial.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">Começar gratuitamente</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Já tenho conta</Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust note */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
          <div className="rounded-xl border border-border/60 bg-card/50 p-6 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-[hsl(142,71%,45%)] shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              O InvestAssist tem fins meramente informativos e educativos. Não executa ordens de
              compra ou venda, nem solicita credenciais bancárias. As sugestões não constituem
              aconselhamento financeiro personalizado.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} InvestAssist. Todos os direitos reservados.
          </p>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Política de Privacidade
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Iniciar sessão
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
