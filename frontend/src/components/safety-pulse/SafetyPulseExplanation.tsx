import React from 'react';
import {
  X,
  HelpCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Info,
  CheckCircle2,
  Database,
  Radio,
} from 'lucide-react';
import type { SafetyPulseResponse } from '../../types';

interface SafetyPulseExplanationProps {
  isOpen: boolean;
  onClose: () => void;
  data: SafetyPulseResponse | null;
}

export const SafetyPulseExplanation: React.FC<SafetyPulseExplanationProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                Why this Safety Pulse Score?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic calculation transparency & data provenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assessment Summary Banner */}
        {data && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Calculated Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-indigo-400">
                  {data.score !== null ? `${data.score}` : '--'}
                </span>
                <span className="text-sm font-bold text-slate-500">/ 100</span>
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {data.risk_level} estimated risk
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Data Confidence</span>
                <span className="font-semibold text-slate-200 capitalize">{data.confidence}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Data Freshness</span>
                <span className="font-semibold text-slate-200 capitalize">{data.data_freshness}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Radius</span>
                <span className="font-semibold text-slate-200">{Math.round(data.assessment_radius_m)}m</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: What was considered */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            1. Information Evaluated in This Sector
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
              <span className="text-slate-400 block font-medium">Verified Unresolved Reports</span>
              <span className="text-lg font-bold text-rose-400">
                {data?.verified_unresolved_reports ?? 0} active hazard(s)
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Weighted by severity, proximity, and half-life recency.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
              <span className="text-slate-400 block font-medium">Verified Resolved Issues</span>
              <span className="text-lg font-bold text-emerald-400">
                {data?.verified_resolved_reports ?? 0} resolved issue(s)
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Excluded from active hazard penalty.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
              <span className="text-slate-400 block font-medium">Verified 24/7 Help Points</span>
              <span className="text-lg font-bold text-sky-400">
                {data?.verified_help_points_count ?? 0} emergency haven(s)
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Police desks & hospitals provide positive buffer reassurance.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
              <span className="text-slate-400 block font-medium">Pending Community Submissions</span>
              <span className="text-lg font-bold text-amber-400">
                {data?.pending_reports_count ?? 0} under review
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Not treated as confirmed facts until community verification.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Contributing Verified Issues */}
        {data && data.strongest_signals && data.strongest_signals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              2. Strongest Contributing Signals
            </h4>
            <div className="space-y-2">
              {data.strongest_signals.map((sig) => (
                <div
                  key={sig.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 capitalize">
                        {sig.title || sig.category.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {sig.severity}
                      </span>
                    </div>
                    {sig.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{sig.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        ~{sig.distance_m}m away
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(sig.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-rose-400 font-bold block">
                      -{sig.penalty_contribution} pts
                    </span>
                    <span className="text-[10px] text-slate-500">penalty</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Aging & Resolution Methodology */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs">
          <h4 className="font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Category Aging & Resolution Rules
          </h4>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Reports age based on issue type half-lives: temporary road obstructions decay quickly (48 hours),
            while broken streetlights (14 days) and structural potholes (30 days) remain relevant until resolved.
            Once an issue is resolved, it is immediately removed from active score penalties.
          </p>
        </div>

        {/* Section 4: Data Sources Marked Unavailable */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            Data Sources Currently Unavailable
          </h4>
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs space-y-1.5 text-slate-400">
            {data?.unavailable_sources?.map((source, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <Radio className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{source} — marked unavailable (not fabricated)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible Use Disclaimer */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200/90 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Important Disclaimer:</strong> {data?.disclaimer || "Safety Pulse is an estimate based on available safety information. It does not guarantee safety or predict crime. Missing reports do not mean that an area is safe."}
          </p>
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
          >
            Close Transparency Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyPulseExplanation;
