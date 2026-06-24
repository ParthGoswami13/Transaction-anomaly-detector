import { motion } from 'framer-motion';

export default function RiskBadge({ score, label }) {
  let level, badgeClass, dotColor;

  if (score === null || score === undefined) {
    level = label || 'N/A';
    badgeClass = 'badge badge-info';
    dotColor = 'bg-blue-400';
  } else if (score >= 0.7) {
    level = label || 'High Risk';
    badgeClass = 'badge badge-danger';
    dotColor = 'bg-red-400';
  } else if (score >= 0.4) {
    level = label || 'Suspicious';
    badgeClass = 'badge badge-warning';
    dotColor = 'bg-amber-400';
  } else {
    level = label || 'Low Risk';
    badgeClass = 'badge badge-success';
    dotColor = 'bg-emerald-400';
  }

  const isHighRisk = score !== null && score !== undefined && score >= 0.7;
  const normalized = score == null ? 0 : Math.max(0, Math.min(score, 1));
  const accent = score == null
    ? '#60a5fa'
    : score >= 0.7
    ? '#ef4444'
    : score >= 0.4
    ? '#f59e0b'
    : '#22c55e';

  return (
    <motion.span
      className={`${badgeClass} ${isHighRisk ? 'pulse-ring' : ''}`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 ${10 + normalized * 18}px ${accent}22`,
        transition: 'border-color 220ms ease, box-shadow 220ms ease, background-color 220ms ease, color 220ms ease',
      }}
      initial={{ opacity: 0, scale: 0.82, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor} ${
          isHighRisk ? 'pulse-dot' : ''
        }`}
        style={{ backgroundColor: accent, marginRight: '6px' }}
      />
      {level}
    </motion.span>
  );
}
