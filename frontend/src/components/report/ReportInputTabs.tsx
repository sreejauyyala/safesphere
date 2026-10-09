import React from 'react';
import { FileText, Mic, Camera } from 'lucide-react';

export type ReportModality = 'text' | 'voice' | 'image';

interface ReportInputTabsProps {
  activeTab: ReportModality;
  onSelectTab: (tab: ReportModality) => void;
  disabled?: boolean;
}

export const ReportInputTabs: React.FC<ReportInputTabsProps> = ({
  activeTab,
  onSelectTab,
  disabled = false,
}) => {
  return (
    <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 shadow-lg">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelectTab('text')}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
          activeTab === 'text'
            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
            : 'text-slate-400 hover:text-slate-200'
        } disabled:opacity-50`}
      >
        <FileText className="w-4 h-4" />
        <span>Text Report</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelectTab('voice')}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
          activeTab === 'voice'
            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
            : 'text-slate-400 hover:text-slate-200'
        } disabled:opacity-50`}
      >
        <Mic className="w-4 h-4" />
        <span>Report by Voice</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelectTab('image')}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
          activeTab === 'image'
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
            : 'text-slate-400 hover:text-slate-200'
        } disabled:opacity-50`}
      >
        <Camera className="w-4 h-4" />
        <span>Report by Photo</span>
      </button>
    </div>
  );
};

export default ReportInputTabs;
