import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Check } from 'lucide-react';

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30 }
  },
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }
};

export default function NotificationDropdown({ isOpen, onClose }) {
  const navigate = useNavigate();

  // Dummy notifications for now, since we don't have a notifications endpoint yet
  const notifications = [
    { id: '1', title: 'Critical Risk Detected', amount: '$4,250.00', time: '2m ago' },
    { id: '2', title: 'Suspicious Velocity', amount: '$850.00', time: '15m ago' },
    { id: '3', title: 'Account Takeover Warning', amount: '$12,000.00', time: '1h ago' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose}></div>
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-[48px] right-0 mt-2 w-80 glass-card rounded-xl shadow-2xl z-50 overflow-hidden border border-[rgba(99,102,241,0.2)]"
          >
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-elevated)]/50">
              <h3 className="font-semibold text-sm">Alerts</h3>
              <button 
                onClick={onClose}
                className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            </div>
            
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.map((notif, i) => (
                <div key={notif.id} className={`p-4 border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors ${i === notifications.length - 1 ? 'border-b-0' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{notif.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{notif.amount} · {notif.time}</p>
                      <button 
                        className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        onClick={() => {
                          onClose();
                          navigate('/cases');
                        }}
                      >
                        Review &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
