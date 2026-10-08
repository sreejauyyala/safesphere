import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MapPin, AlertTriangle, Navigation, MoreHorizontal } from 'lucide-react';

export interface MobileNavigationProps {
  onOpenMoreMenu: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenMoreMenu }) => {
  const primaryTabs = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/map', label: 'Map', icon: MapPin },
    { to: '/report', label: 'Report', icon: AlertTriangle },
    { to: '/journey', label: 'Journey', icon: Navigation },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 glass-panel border-t border-slate-800 flex items-center justify-around px-2 pb-safe"
      aria-label="Mobile Navigation"
    >
      {primaryTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{tab.label}</span>
          </NavLink>
        );
      })}

      {/* More Button to trigger drawer */}
      <button
        type="button"
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="More navigation options"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">More</span>
      </button>
    </nav>
  );
};

export default MobileNavigation;
