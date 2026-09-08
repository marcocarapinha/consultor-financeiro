'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wallet, Clock, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientOnly } from '@/components/client-only';
import { SafeNumber } from '@/components/safe-format';

interface Props {
  portfolio: any;
  loading: boolean;
  riskProfile: string;
}

export function PortfolioSummary({ portfolio, loading, riskProfile }: Props) {
  const totalValue = portfolio?.totalValue ?? 0;
  const dailyChange = portfolio?.dailyChange ?? 0;
  const dailyChangePct = portfolio?.dailyChangePercent ?? 0;
  const totalCost = portfolio?.totalCost ?? 0;
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const isPositiveDay = dailyChange >= 0;
  const isPositiveTotal = totalGain >= 0;
  const lastUpdated = portfolio?.lastUpdated;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i: number) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Wallet className="w-4 h-4" /> Valor Total
            </div>
            <p className="text-2xl font-mono font-bold">
              <SafeNumber value={totalValue} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />€
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {isPositiveDay ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Variação Hoje
            </div>
            <p className={`text-2xl font-mono font-bold ${isPositiveDay ? 'gain-text' : 'loss-text'}`}>
              {isPositiveDay ? '+' : ''}<SafeNumber value={dailyChange} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />€
            </p>
            <p className={`text-sm font-mono ${isPositiveDay ? 'gain-text' : 'loss-text'}`}>
              ({isPositiveDay ? '+' : ''}{dailyChangePct?.toFixed?.(2) ?? '0.00'}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {isPositiveTotal ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Ganho/Perda Total
            </div>
            <p className={`text-2xl font-mono font-bold ${isPositiveTotal ? 'gain-text' : 'loss-text'}`}>
              {isPositiveTotal ? '+' : ''}<SafeNumber value={totalGain} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />€
            </p>
            <p className={`text-sm font-mono ${isPositiveTotal ? 'gain-text' : 'loss-text'}`}>
              ({isPositiveTotal ? '+' : ''}{totalGainPct?.toFixed?.(2) ?? '0.00'}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Shield className="w-4 h-4" /> Perfil de Risco
            </div>
            <Badge variant={riskProfile === 'Agressivo' ? 'destructive' : riskProfile === 'Moderado' ? 'default' : 'secondary'} className="mt-1">
              {riskProfile}
            </Badge>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Clock className="w-3 h-3" />
                <ClientOnly fallback={<span>---</span>}>
                  <span suppressHydrationWarning>{new Date(lastUpdated).toLocaleTimeString('pt-PT')}</span>
                </ClientOnly>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
