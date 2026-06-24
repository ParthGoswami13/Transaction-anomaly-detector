import { motion } from 'framer-motion';
import CountUpModule from 'react-countup';
import { useInView } from 'react-intersection-observer';

const CountUp = CountUpModule.default || CountUpModule;

export default function StatsCard({ icon: Icon, label, value, subtitle, color = 'indigo', delay = 0, onActionClick }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 });

  const colorMap = {
    indigo:  { text: 'text-indigo-400',  iconBg: 'bg-indigo-500/20',  gradient: 'card-gradient-indigo' },
    red:     { text: 'text-red-400',     iconBg: 'bg-red-500/20',     gradient: 'card-gradient-red' },
    amber:   { text: 'text-amber-400',   iconBg: 'bg-amber-500/20',   gradient: 'card-gradient-amber' },
    emerald: { text: 'text-emerald-400', iconBg: 'bg-emerald-500/20', gradient: 'card-gradient-emerald' },
    purple:  { text: 'text-purple-400',  iconBg: 'bg-purple-500/20',  gradient: 'card-gradient-purple' },
    blue:    { text: 'text-blue-400',    iconBg: 'bg-blue-500/20',    gradient: 'card-gradient-blue' },
  };

  const c = colorMap[color] || colorMap.indigo;

  // Parse numeric value for CountUp
  const numericValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
    : (typeof value === 'number' ? value : 0);

  const isPercentage = typeof value === 'string' && value.includes('%');
  const prefix = typeof value === 'string' && value.startsWith('$') ? '$' : '';
  const suffix = isPercentage ? '%' : '';
  const decimals = isPercentage || (typeof value === 'string' && value.includes('.')) ? 1 : 0;

  return (
    <motion.div
      ref={ref}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 card-content flex flex-col justify-between h-full relative overflow-hidden`}
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(99,102,241,0.2)' }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {inView ? (
              <CountUp
                start={0}
                end={numericValue}
                duration={2}
                separator=","
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
              />
            ) : (
              `${prefix}0${suffix}`
            )}
          </p>
          {subtitle && (
            <p className={`text-xs mt-2 font-medium ${c.text} truncate`}>{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${c.iconBg} shrink-0`}>
          {Icon && <Icon size={20} className={c.text} />}
        </div>
      </div>
      
      {onActionClick && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <button 
            onClick={(e) => { e.stopPropagation(); onActionClick(); }}
            className={`text-xs font-bold hover:underline flex items-center gap-1 ${c.text} hover:opacity-80 transition-opacity`}
          >
            View &rarr;
          </button>
        </div>
      )}
    </motion.div>
  );
}
