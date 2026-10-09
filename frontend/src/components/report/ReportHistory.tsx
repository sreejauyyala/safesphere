import React, { useEffect, useState } from 'react';
import { RefreshCw, Filter, AlertCircle, Plus } from 'lucide-react';
import type { ReportItem } from '../../types';
import reportService from '../../services/reportService';
import ReportCard from './ReportCard';
import ReportEmptyState from './ReportEmptyState';

interface ReportHistoryProps {
  onNewReport: () => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({ onNewReport }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportService.getMyReports();
      setReports(data);
    } catch {
      setError('Unable to load your report history. Please check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter((r) => {
    if (filterCategory === 'all') return true;
    return r.category === filterCategory;
  });

  return (
    <div className="space-y-4">
      {/* Top Header / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">My Submitted Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track status, community verification, and resolution updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onNewReport}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Report
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchReports}
            className="font-semibold text-cyan-400 hover:underline shrink-0 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Chips */}
      {reports.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
              filterCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({reports.length})
          </button>
          {['poor_lighting', 'road_damage', 'road_obstruction', 'isolated_area', 'transport_issue', 'general_safety'].map((cat) => {
            const count = reports.filter((r) => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full font-medium transition-colors shrink-0 capitalize ${
                  filterCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.replace('_', ' ')} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-slate-800/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <ReportEmptyState onNewReport={onNewReport} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportHistory;
