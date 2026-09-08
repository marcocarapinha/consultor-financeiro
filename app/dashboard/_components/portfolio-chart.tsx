'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart as LineIcon, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const ChartContent = dynamic(() => import('./portfolio-chart-content'), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> });

const PERIODS = ['1D', '1M', '3M', '6M', '1A', 'Tudo'];

export function PortfolioChart() {
  const [period, setPeriod] = useState('1M');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portfolio/history?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d?.history ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineIcon className="w-5 h-5" /> Evolução da Carteira
          </CardTitle>
          <div className="flex gap-1">
            {PERIODS.map((p: string) => (
              <Button key={p} variant={period === p ? 'default' : 'ghost'} size="xs" onClick={() => setPeriod(p)}>
                {p}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ChartContent data={data} />
        )}
      </CardContent>
    </Card>
  );
}
