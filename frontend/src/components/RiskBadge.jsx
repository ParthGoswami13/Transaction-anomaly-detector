export default function RiskBadge({ score, label }) {
  let level, badgeClass;

  if (score === null || score === undefined) {
    level = label || 'N/A';
    badgeClass = 'badge badge-info';
  } else if (score >= 0.7) {
    level = label || 'High Risk';
    badgeClass = 'badge badge-danger';
  } else if (score >= 0.4) {
    level = label || 'Suspicious';
    badgeClass = 'badge badge-warning';
  } else {
    level = label || 'Low Risk';
    badgeClass = 'badge badge-success';
  }

  return (
    <span className={badgeClass}>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          score >= 0.7
            ? 'bg-red-400 pulse-dot'
            : score >= 0.4
            ? 'bg-amber-400'
            : 'bg-emerald-400'
        }`}
      />
      {level}
    </span>
  );
}
