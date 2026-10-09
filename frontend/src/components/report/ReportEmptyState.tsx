import React from 'react';
import { ShieldAlert, PlusCircle } from 'lucide-react';

interface ReportEmptyStateProps {
  onNewReport?: () => void;
}

export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({ onNewReport }) => {
  return (
    <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 max-w-md mx-auto space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-100">No Safety Reports Yet</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          You haven't submitted any hazard or safety observations. When you spot poor lighting, road damage, or obstructions, report them to alert fellow commuters.
        </p>
      </div>

      {onNewReport && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onNewReport}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Report a Safety Issue
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportEmptyState;
