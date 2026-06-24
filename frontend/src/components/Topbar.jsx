import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Bell, HelpCircle, Moon, Sun } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useTheme } from '../context/ThemeContext';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('finguard_user')) || {};
  } catch {
    return {};
  }
}

export default function Topbar() {
  const user = getUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 w-full h-[72px] z-[60] bg-blue-600 shadow-lg">
      <div className="flex items-center justify-between h-full px-6 max-w-[1920px] mx-auto text-white">
        {/* Left: Logo & Welcome */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-lg sidebar-logo-gradient flex items-center justify-center logo-animate shadow-[0_0_18px_rgba(99,102,241,0.2)]"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield size={20} className="text-white" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">FinGuard</h1>
              <p className="text-[0.65rem] text-blue-200 tracking-wider uppercase">
                Fraud Detection
              </p>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="hidden md:block w-[1px] h-8 bg-blue-500 mx-2"></div>
          <p className="hidden md:block text-white font-medium">
            Welcome {user.name || 'name'}!
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors text-white"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-full hover:bg-blue-700 transition-colors text-white"
          >
            <Bell size={20} />
            {/* Unread badge indicator */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 pulse-dot"></span>
          </motion.button>

          <NotificationDropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors text-white"
            title="Help & Support"
          >
            <HelpCircle size={20} />
          </motion.button>
          
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold border border-white/20">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
