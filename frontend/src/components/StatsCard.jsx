export default function StatsCard({ icon: Icon, label, value, subtitle, color = 'indigo', delay = 0 }) {
  const colorMap = {
    indigo: { bg: 'from-indigo-500/15 to-indigo-600/5', text: 'text-indigo-400', iconBg: 'bg-indigo-500/20' },
    red: { bg: 'from-red-500/15 to-red-600/5', text: 'text-red-400', iconBg: 'bg-red-500/20' },
    amber: { bg: 'from-amber-500/15 to-amber-600/5', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
    emerald: { bg: 'from-emerald-500/15 to-emerald-600/5', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
    purple: { bg: 'from-purple-500/15 to-purple-600/5', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
    blue: { bg: 'from-blue-500/15 to-blue-600/5', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  };

  const c = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="glass-card p-5 fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${c.text}`}>{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${c.iconBg}`}>
          {Icon && <Icon size={20} className={c.text} />}
        </div>
      </div>
    </div>
  );
}
