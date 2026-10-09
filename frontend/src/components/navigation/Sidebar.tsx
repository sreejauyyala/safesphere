import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  MapPin, 
  AlertTriangle, 
  Navigation, 
  Users, 
  HeartHandshake, 
  MessageSquare, 
  User, 
  Radio, 
  ShieldCheck, 
  ShieldAlert, 
  LayoutDashboard 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onLinkClick }) => {
  const navigate = useNavigate();
  const { isMinor, userProfile } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const isAdmin = userProfile?.role === 'ORGANIZATION_ADMIN' || userProfile?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    apiService.getHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const navItems = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/map', label: 'Safety Map', icon: MapPin },
    { to: '/report', label: 'Report Issue', icon: AlertTriangle },
    { to: '/journey', label: 'Safe Journey', icon: Navigation },
    { to: '/safety-mode', label: 'Safety Mode', icon: ShieldAlert },
    { to: '/trusted-circle', label: 'Trusted Circle', icon: Users },
    { 
      to: '/guardian', 
      label: 'Guardian Connect', 
      icon: HeartHandshake,
      badge: isMinor ? 'Under 18' : undefined,
      badgeColor: 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
    },
    { to: '/feedback', label: 'Safety Feedback', icon: MessageSquare },
    { to: '/profile', label: 'User Profile', icon: User },
  ];

  const handleSosClick = () => {
    navigate('/trusted-circle?sos=true');
    if (onLinkClick) onLinkClick();
  };

  return (
    <aside
      className={`w-64 shrink-0 glass-panel border-r border-slate-800 flex flex-col justify-between p-4 ${className}`}
      aria-label="Sidebar Navigation"
    >
      {/* Top Section: Nav Links */}
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
            Core Network
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 px-3">
              Operations
            </span>
            <nav className="mt-2 space-y-1">
              <NavLink
                to="/admin"
                onClick={onLinkClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Admin Operations</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                  {userProfile?.role === 'SYSTEM_ADMIN' ? 'SYS' : 'ORG'}
                </span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Section: Emergency SOS & Network Health */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        {/* Emergency SOS Button */}
        <button
          type="button"
          onClick={handleSosClick}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-200 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 glow-rose"
          aria-label="Emergency SOS Trigger"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Emergency SOS</span>
        </button>

        {/* System Connectivity Pill */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                apiOnline === true
                  ? 'bg-emerald-500 animate-pulse'
                  : apiOnline === false
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-400 font-medium">
              {apiOnline === true ? 'Network Online' : apiOnline === false ? 'Offline Mode' : 'Connecting...'}
            </span>
          </div>
          {isMinor ? (
            <span title="Minor Protection Guard Active">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            </span>
          ) : (
            <span title="SafeSphere Guard Active">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
