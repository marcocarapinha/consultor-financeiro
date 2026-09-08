'use client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function PortfolioChartContent({ data }: { data: any[] }) {
  const safeData = (data ?? []).map((d: any) => ({
    date: d?.date ?? '',
    value: d?.value ?? 0,
  }));

  const values = safeData.map((d: any) => d.value);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const isPositive = (safeData?.[safeData.length - 1]?.value ?? 0) >= (safeData?.[0]?.value ?? 0);

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            tickFormatter={(v: string) => {
              const parts = (v ?? '').split('-');
              return `${parts?.[2] ?? ''}/${parts?.[1] ?? ''}`;
            }}
          />
          <YAxis
            domain={[min, max]}
            tickLine={false}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${(v ?? 0)?.toFixed?.(0) ?? '0'}€`}
            width={60}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(222, 47%, 9%)', border: '1px solid hsl(217, 33%, 17%)', borderRadius: '8px', fontSize: 11 }}
            labelStyle={{ color: 'hsl(215, 20%, 55%)' }}
            formatter={(value: any) => [`${Number(value ?? 0).toFixed(2)}€`, 'Valor']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'}
            fill="url(#colorValue)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
