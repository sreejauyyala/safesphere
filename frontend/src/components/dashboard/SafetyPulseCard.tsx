import React from 'react';
import { Flame, Info } from 'lucide-react';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';

export interface SafetyPulseCardProps {
  score?: number | null;
  statusText?: string;
  className?: string;
}

export const SafetyPulseCard: React.FC<SafetyPulseCardProps> = ({
  score = null,
  statusText = 'Calculating...',
  className = '',
}) => {
  return (
    <Card
      variant="panel"
      glow="blue"
      className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-indigo-900/40 ${className}`}
    >
      {/* Background Radial Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Flame className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              SAFETY PULSE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Territorial Safety Index
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time AI & community hazard evaluation
          </p>
        </div>

        <StatusBadge status="calculating" label={statusText} pulse />
      </div>

      {/* Main Score Display Area */}
      <div className="my-6 p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-300">
            {score !== null ? score : '--'}
          </span>
          <span className="text-xl font-bold text-slate-500">/ 100</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Safety Pulse will appear here once local GPS and hotspot scoring connect in Step 4.</span>
        </div>
      </div>

      {/* Metric Breakdown Placeholders */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block uppercase">Streetlight Index</span>
          <span className="font-bold text-slate-300">--</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block uppercase">Hazard Density</span>
          <span className="font-bold text-slate-300">--</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block uppercase">Active Havens</span>
          <span className="font-bold text-slate-300">--</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block uppercase">Vigilance Level</span>
          <span className="font-bold text-slate-300">Normal</span>
        </div>
      </div>
    </Card>
  );
};

export default SafetyPulseCard;
