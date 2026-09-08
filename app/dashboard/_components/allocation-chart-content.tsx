'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

export default function AllocationChartContent({ data }: { data: any[] }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data ?? []}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {(data ?? []).map((entry: any, i: number) => (
              <Cell key={`cell-${i}`} fill={entry?.fill ?? '#60B5FF'} />
            ))}
          </Pie>
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(222, 47%, 9%)', border: '1px solid hsl(217, 33%, 17%)', borderRadius: '8px', fontSize: 11 }}
            formatter={(value: any) => [`${Number(value ?? 0).toFixed(2)}€`]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
