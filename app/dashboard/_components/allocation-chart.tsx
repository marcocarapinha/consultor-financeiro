'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AllocationChartContent = dynamic(() => import('./allocation-chart-content'), { ssr: false, loading: () => <Skeleton className="h-[260px] w-full" /> });

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#80D8C3', '#A19AD3', '#FF90BB', '#72BF78', '#FF6363'];

export function AllocationChart({ assets }: { assets: any[] }) {
  const grouped: Record<string, number> = {};
  for (const a of (assets ?? [])) {
    const key = a?.assetClass ?? a?.sector ?? 'Outros';
    grouped[key] = (grouped[key] ?? 0) + (a?.value ?? 0);
  }
  const chartData = Object.entries(grouped).map(([name, value], i: number) => ({
    name,
    value: Math.round((value ?? 0) * 100) / 100,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieIcon className="w-5 h-5" /> Alocação
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados de alocação
          </div>
        ) : (
          <AllocationChartContent data={chartData} />
        )}
      </CardContent>
    </Card>
  );
}
