import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e', '#22c55e'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm" style={{ pointerEvents: 'none' }}>
        <p className="font-semibold text-[var(--text-primary)]">{payload[0].payload.name}</p>
        <p className="text-indigo-400">PR-AUC: {payload[0].value.toFixed(4)}</p>
      </div>
    );
  }
  return null;
};

export default function ModelComparisonChart({ results }) {
  if (!results || Object.keys(results).length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)]">
        <div className="text-center">
          <p className="text-lg font-medium">No comparison data</p>
          <p className="text-sm mt-1">Train the ensemble models to see comparison results.</p>
        </div>
      </div>
    );
  }

  const data = Object.entries(results).map(([name, prAuc]) => ({
    name: name.replace(/_/g, ' '),
    prAuc: typeof prAuc === 'number' ? prAuc : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="prAuc" radius={[6, 6, 0, 0]} barSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
