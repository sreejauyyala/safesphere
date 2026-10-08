import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  AlertTriangle, 
  Navigation, 
  Users, 
  HeartHandshake, 
  LayoutDashboard, 
  Flame,
  Radio,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, isAuthenticated, isMinor, logout } = useAuth();

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [sosTriggered, setSosTriggered] = useState<boolean>(false);

  useEffect(() => {
    // Check backend health status
    apiService.getHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const handleSosClick = async () => {
    try {
      setSosTriggered(true);
      await apiService.triggerSOS();
      alert('⚠️ SOS Signal Dispatched! (Foundation test trigger verified with backend)');
    } catch {
      alert('SOS triggered locally. Check backend connectivity.');
    } finally {
      setTimeout(() => setSosTriggered(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/home', label: 'Home', icon: Shield },
    { to: '/map', label: 'Safety Map', icon: MapPin },
    { to: '/report', label: 'Report', icon: AlertTriangle },
    { to: '/journey', label: 'Journey', icon: Navigation },
    { to: '/safety-mode', label: 'Safe Pulse', icon: Flame },
    { to: '/trusted-circle', label: 'Trusted Circle', icon: Users },
    { to: '/guardian', label: 'Guardian', icon: HeartHandshake },
    { to: '/admin', label: 'Admin', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SafeSphere
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                24/7 Intel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Minor Safeguard Badge */}
            {isAuthenticated && isMinor && (
              <span className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-purple-300 px-2 py-0.5 rounded-full bg-purple-950/40 border border-purple-800/50">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                Minor Protection
              </span>
            )}

            {/* API Health Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline === true
                    ? 'bg-emerald-500 animate-pulse'
                    : apiOnline === false
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-400">
                {apiOnline === true ? 'API Connected' : apiOnline === false ? 'API Offline' : 'Connecting...'}
              </span>
            </div>

            {/* User Profile or Auth Action */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                  title="Your Profile"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {userProfile?.full_name ? userProfile.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline-block text-xs font-medium text-slate-300 pr-1">
                    {userProfile?.full_name?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                >
                  Join
                </Link>
              </div>
            )}

            {/* Instant SOS Trigger Button */}
            <button
              id="sos-trigger-btn"
              onClick={handleSosClick}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all duration-200 ${
                sosTriggered
                  ? 'bg-red-700 animate-ping'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 glow-rose'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
