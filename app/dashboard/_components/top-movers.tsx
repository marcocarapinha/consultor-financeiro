'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';

export function TopMovers({ assets }: { assets: any[] }) {
  const sorted = [...(assets ?? [])].filter((a: any) => !a?.quote?.error).sort((a: any, b: any) => (b?.dayChangePercent ?? 0) - (a?.dayChangePercent ?? 0));
  const gainers = sorted.slice(0, 3);
  const losers = sorted.slice(-3).reverse();

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Flame className="w-5 h-5" /> Destaques do Dia</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Sem dados disponíveis.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Flame className="w-5 h-5" /> Destaques do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium gain-text flex items-center gap-1 mb-2"><TrendingUp className="w-4 h-4" /> Maiores Ganhos</p>
          {gainers.map((a: any, i: number) => (
            <div key={a?.id ?? `gain-${i}`} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div>
                <span className="font-medium text-sm">{a?.name ?? '-'}</span>
                <span className="text-xs text-muted-foreground ml-2">{a?.ticker ?? ''}</span>
              </div>
              <span className="font-mono text-sm gain-text">+{a?.dayChangePercent?.toFixed?.(2) ?? '0'}%</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium loss-text flex items-center gap-1 mb-2"><TrendingDown className="w-4 h-4" /> Maiores Perdas</p>
          {losers.filter((a: any) => (a?.dayChangePercent ?? 0) < 0).map((a: any, i: number) => (
            <div key={a?.id ?? `loss-${i}`} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div>
                <span className="font-medium text-sm">{a?.name ?? '-'}</span>
                <span className="text-xs text-muted-foreground ml-2">{a?.ticker ?? ''}</span>
              </div>
              <span className="font-mono text-sm loss-text">{a?.dayChangePercent?.toFixed?.(2) ?? '0'}%</span>
            </div>
          ))}
          {losers.filter((a: any) => (a?.dayChangePercent ?? 0) < 0).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem perdas hoje 🎉</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
