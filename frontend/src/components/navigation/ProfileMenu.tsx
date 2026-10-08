import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, HeartHandshake, Users, Settings, LogOut, ShieldAlert, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userProfile, isMinor, logout } = useAuth();

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-transparent" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Menu Dropdown */}
      <div
        className="absolute right-0 top-12 z-50 w-64 rounded-2xl glass-panel border border-slate-800 shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-150"
        role="menu"
        aria-label="User Account Menu"
      >
        {/* User Info Header */}
        <div className="p-3 border-b border-slate-800/80 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow shrink-0">
              {userProfile?.full_name ? userProfile.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-100 truncate">
                {userProfile?.full_name || 'SafeSphere User'}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                {userProfile?.email || 'user@safesphere.org'}
              </p>
            </div>
          </div>
          
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3 text-emerald-400" />
              {userProfile?.role || 'USER'}
            </span>
            {isMinor && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/50 text-purple-300 border border-purple-800/60 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-purple-400" />
                Minor Account
              </span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-0.5 text-xs text-slate-300">
          <Link
            to="/profile"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/60 hover:text-white transition-colors"
            role="menuitem"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>My Profile</span>
          </Link>

          {/* Guardian Connect - highlighted if minor, available to all for settings */}
          <Link
            to="/guardian"
            onClick={handleLinkClick}
            className={`flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/60 hover:text-white transition-colors ${
              isMinor ? 'text-purple-300 font-medium' : ''
            }`}
            role="menuitem"
          >
            <div className="flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-purple-400" />
              <span>Guardian Connect</span>
            </div>
            {isMinor && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                Required
              </span>
            )}
          </Link>

          <Link
            to="/trusted-circle"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/60 hover:text-white transition-colors"
            role="menuitem"
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>Trusted Circle</span>
          </Link>

          <Link
            to="/feedback"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/60 hover:text-white transition-colors"
            role="menuitem"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Feedback & Preferences</span>
          </Link>
        </div>

        {/* Logout */}
        <div className="pt-1 mt-1 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-xs font-semibold"
            role="menuitem"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileMenu;
