'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function BenchmarkComparison() {
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/benchmarks?period=1M')
      .then((r) => r.json())
      .then((d) => setBenchmarks(d?.benchmarks ?? []))
      .catch(() => setBenchmarks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" /> Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(benchmarks ?? []).map((b: any, i: number) => {
          const q = b?.quote;
          const change = q?.changePercent ?? 0;
          const isPositive = change >= 0;
          return (
            <div key={b?.ticker ?? `bench-${i}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="font-medium text-sm">{b?.name ?? '-'}</p>
                <p className="text-xs text-muted-foreground font-mono">{b?.ticker ?? ''}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{q?.price?.toFixed?.(2) ?? '-'}</p>
                {q?.error ? (
                  <p className="text-xs text-muted-foreground">Indisponível</p>
                ) : (
                  <p className={`text-xs font-mono ${isPositive ? 'gain-text' : 'loss-text'}`}>
                    {isPositive ? '+' : ''}{change?.toFixed?.(2) ?? '0'}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">Fonte: Yahoo Finance</p>
      </CardContent>
    </Card>
  );
}
