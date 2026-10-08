import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, AlertTriangle, Navigation, Users, Flame, HeartHandshake } from 'lucide-react';

export const HomePage: React.FC = () => {
  const quickActions = [
    { title: 'Interactive Safety Map', desc: 'Real-time hazard pins & verified help havens', to: '/map', icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Report Incident / Hazard', desc: 'Submit text, voice, or photo reports with AI scoring', to: '/report', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { title: 'Start Monitored Journey', desc: 'Safe-route navigation with automated arrival timer', to: '/journey', icon: Navigation, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { title: 'I Feel Unsafe Mode', desc: 'Activate Safety Pulse continuous geo-telemetry', to: '/safety-mode', icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'Trusted Circle', desc: 'Manage your primary emergency dispatch contacts', to: '/trusted-circle', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Guardian Protection', desc: 'Minor monitoring & linked guardian alerts', to: '/guardian', icon: HeartHandshake, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Community Network Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Welcome to SafeSphere</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Your 24/7 intelligence shield for late-night journeys, community vigilance, and instant emergency response.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/safety-mode"
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Flame className="w-4 h-4" />
              <span>Safe Pulse</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Modules Grid */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Safety Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="p-5 rounded-2xl glass-card border border-slate-800/80 hover:border-slate-700 hover:scale-[1.01] transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-100 text-sm group-hover:text-rose-400 transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
