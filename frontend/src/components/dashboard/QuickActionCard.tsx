import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation, AlertTriangle, ShieldCheck, Radio, ArrowRight } from 'lucide-react';

export interface QuickActionCardProps {
  className?: string;
  onSosClick?: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ className = '', onSosClick }) => {
  const navigate = useNavigate();

  const handleSos = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSosClick) {
      onSosClick();
    } else {
      navigate('/safety-mode');
    }
  };

  const actions = [
    {
      title: 'Start Safe Journey',
      description: 'Plan monitored travel with automated check-in',
      to: '/journey',
      icon: Navigation,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20',
      accent: 'border-indigo-500/30',
    },
    {
      title: 'Report Safety Issue',
      description: 'Log dark spots, hazards, or incidents',
      to: '/report',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20',
      accent: 'border-amber-500/30',
    },
    {
      title: 'I Feel Unsafe',
      description: 'Activate silent background vigilance & pulse',
      to: '/safety-mode',
      icon: ShieldCheck,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20',
      accent: 'border-rose-500/30',
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Actions
        </h3>
        <span className="text-[11px] text-slate-500">1-Touch Network Dispatch</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Primary Safe Actions */}
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.to}
              to={act.to}
              className={`p-4 rounded-2xl glass-card border ${act.accent} hover:border-slate-600 hover:scale-[1.01] transition-all flex flex-col justify-between group`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${act.bg} border flex items-center justify-center ${act.color} transition-colors`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                  {act.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {act.description}
                </p>
              </div>
            </Link>
          );
        })}

        {/* SOS Action Card (Prominent Danger Styling) */}
        <button
          type="button"
          onClick={handleSos}
          className="p-4 rounded-2xl bg-gradient-to-br from-red-600/20 via-rose-600/20 to-red-950/40 border border-red-500/40 hover:border-red-400 hover:scale-[1.01] transition-all flex flex-col justify-between text-left group shadow-lg"
          aria-label="Emergency SOS Dispatch"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Emergency
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-bold text-red-200 group-hover:text-white transition-colors">
              Instant SOS Signal
            </h4>
            <p className="text-[11px] text-red-300/80 mt-0.5">
              Broadcasts urgent distress beacon to Trusted Circle (Connects in Step 7)
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default QuickActionCard;
