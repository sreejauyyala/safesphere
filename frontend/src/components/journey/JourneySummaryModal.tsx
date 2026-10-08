import React from 'react';
import { CheckCircle2, Clock, Route, Compass } from 'lucide-react';
import type { JourneySummary } from '../../types';

interface JourneySummaryModalProps {
  summary: JourneySummary | null;
  onClose: () => void;
}

export const JourneySummaryModal: React.FC<JourneySummaryModalProps> = ({ summary, onClose }) => {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-1">Journey Completed ✓</h3>
        <p className="text-slate-400 text-sm mb-6">
          Destination reached safely: <span className="text-slate-200 font-semibold">{summary.destination_name}</span>
        </p>

        <div className="grid grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-6">
          <div className="flex flex-col items-center">
            <Clock className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-[11px] text-slate-500">Duration</span>
            <span className="text-base font-bold text-white">
              {summary.duration_minutes} <span className="text-xs text-slate-400 font-normal">min</span>
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-800/60">
            <Route className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] text-slate-500">Distance</span>
            <span className="text-base font-bold text-white">
              {summary.distance_travelled.toFixed(2)} <span className="text-xs text-slate-400 font-normal">km</span>
            </span>
          </div>

          <div className="flex flex-col items-center">
            <Compass className="w-4 h-4 text-blue-400 mb-1" />
            <span className="text-[11px] text-slate-500">Points</span>
            <span className="text-base font-bold text-white">
              {summary.points_recorded}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default JourneySummaryModal;
