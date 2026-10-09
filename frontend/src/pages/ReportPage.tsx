import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusCircle, History } from 'lucide-react';
import ReportForm from '../components/report/ReportForm';
import ReportHistory from '../components/report/ReportHistory';

export const ReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'history' ? 'history' : 'new';

  const setTab = (tab: 'new' | 'history') => {
    if (tab === 'history') {
      setSearchParams({ tab: 'history' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation Pill Tabs */}
      <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setTab('new')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            currentTab === 'new'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Safety Report</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            currentTab === 'history'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Reports</span>
        </button>
      </div>

      {/* Tab Body */}
      {currentTab === 'new' ? (
        <ReportForm />
      ) : (
        <ReportHistory onNewReport={() => setTab('new')} />
      )}
    </div>
  );
};

export default ReportPage;
