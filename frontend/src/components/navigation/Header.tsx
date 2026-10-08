import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, Bell, Menu, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationPanel from './NotificationPanel';
import ProfileMenu from './ProfileMenu';
import { mockNotifications, type MockNotificationItem } from '../../mock/demoData';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { userProfile, isAuthenticated, isMinor } = useAuth();
  const [notifications, setNotifications] = useState<MockNotificationItem[]>(mockNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-40 h-16 glass-panel border-b border-slate-800 flex items-center px-4 sm:px-6 lg:px-8 justify-between">
      {/* Left: Brand Logo & Mobile Toggle */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link to="/home" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              SafeSphere
            </span>
            <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
              24/7 Intel
            </span>
          </div>
        </Link>
      </div>

      {/* Middle: Quick Search / Command Input (Desktop/Tablet) */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search safe routes, help havens, hazard zones..."
            className="w-full pl-9 pr-12 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
          />
          <kbd className="hidden lg:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Actions, Notifications & Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Minor Alert Tag (if minor) */}
        {isAuthenticated && isMinor && (
          <span className="hidden xl:flex items-center gap-1 text-[11px] font-semibold text-purple-300 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-800/50">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            Minor Safeguard
          </span>
        )}

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            aria-label="View safety notifications"
            aria-expanded={isNotifOpen}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
            )}
          </button>

          <NotificationPanel
            notifications={notifications}
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            onMarkAllAsRead={handleMarkAllRead}
            onDismiss={handleDismissNotification}
          />
        </div>

        {/* User Profile Avatar / Sign In */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              aria-label="User profile and menu"
              aria-expanded={isProfileOpen}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow">
                {userProfile?.full_name ? userProfile.full_name[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden md:inline-block text-xs font-semibold text-slate-200 pr-2">
                {userProfile?.full_name?.split(' ')[0] || 'User'}
              </span>
            </button>

            <ProfileMenu
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-xs font-semibold shadow hover:opacity-95 transition-opacity"
            >
              Join
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
