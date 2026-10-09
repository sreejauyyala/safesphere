import React from 'react';
import { CheckCircle2, Map, FileText, PlusCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ReportItem } from '../../types';
import { CATEGORIES } from './ReportCategorySelector';

interface ReportSuccessProps {
  report: ReportItem;
  onReset: () => void;
}

export const ReportSuccess: React.FC<ReportSuccessProps> = ({ report, onReset }) => {
  const navigate = useNavigate();

  const catObj = CATEGORIES.find((c) => c.id === report.category) || {
    name: report.category,
    icon: '⚠️',
  };

  return (
    <div className="text-center py-6 px-4 space-y-6 max-w-lg mx-auto animate-in zoom-in-95 duration-200">
      {/* Success Badge */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-100">Report Submitted ✓</h2>
        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
          Thank you for contributing to community safety intelligence. Your report is now published on the SafeSphere network.
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Category:</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-sm">
            <span>{catObj.icon}</span>
            <span>{catObj.name}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Location:</span>
          <span className="font-semibold text-slate-200 text-sm truncate max-w-[200px]">
            {report.location_label || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Status:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            Open (Under Review)
          </span>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate(`/report/${report.id}`)}
          className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <FileText className="w-4 h-4 text-cyan-400" />
          View Report Details
        </button>

        <button
          type="button"
          onClick={() => navigate('/map')}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Map className="w-4 h-4" />
          View on Safety Map
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Report Another Issue
        </button>
      </div>
    </div>
  );
};

export default ReportSuccess;
