import React from 'react';
import { ShieldCheck, AlertCircle, AlertOctagon, Info } from 'lucide-react';

export interface SeverityOption {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  name: string;
  badge: string;
  description: string;
  colorClass: string;
  activeBorder: string;
  activeBg: string;
}

export const SEVERITIES: SeverityOption[] = [
  {
    level: 'LOW',
    name: 'Low',
    badge: 'Minor',
    description: 'Minor issue that may need attention.',
    colorClass: 'text-emerald-400',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/30',
    activeBg: 'bg-emerald-500/10',
  },
  {
    level: 'MEDIUM',
    name: 'Medium',
    badge: 'Moderate',
    description: "Issue that could affect people's safety or movement.",
    colorClass: 'text-amber-400',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/30',
    activeBg: 'bg-amber-500/10',
  },
  {
    level: 'HIGH',
    name: 'High',
    badge: 'Urgent',
    description: 'Serious safety concern requiring prompt attention.',
    colorClass: 'text-rose-400',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/30',
    activeBg: 'bg-rose-500/10',
  },
];

interface ReportSeveritySelectorProps {
  selectedSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  onSelectSeverity: (severity: 'LOW' | 'MEDIUM' | 'HIGH') => void;
}

export const ReportSeveritySelector: React.FC<ReportSeveritySelectorProps> = ({
  selectedSeverity,
  onSelectSeverity,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">
          Estimated Severity <span className="text-rose-400">*</span>
        </label>
        <span className="text-xs text-slate-400">Contextual impact level</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SEVERITIES.map((opt) => {
          const isSelected = selectedSeverity === opt.level;
          const Icon =
            opt.level === 'LOW'
              ? ShieldCheck
              : opt.level === 'MEDIUM'
              ? AlertCircle
              : AlertOctagon;

          return (
            <button
              key={opt.level}
              type="button"
              onClick={() => onSelectSeverity(opt.level)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? `${opt.activeBg} ${opt.activeBorder} text-white`
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${opt.colorClass}`} />
                    <span className="font-bold text-sm text-slate-100">{opt.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'bg-slate-950/60 border-slate-700 text-slate-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          Severity represents observed physical or environmental obstruction, not a definitive prediction of danger.
        </span>
      </div>
    </div>
  );
};

export default ReportSeveritySelector;
