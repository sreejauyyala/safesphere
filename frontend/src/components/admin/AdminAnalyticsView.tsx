import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  Calendar 
} from 'lucide-react';
import type { AdminAnalytics } from '../../types';
import adminService from '../../services/adminService';

interface AdminAnalyticsViewProps {
  onRefreshParent?: () => void;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [timeWindowDays, setTimeWindowDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeWindowDays]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAnalytics(timeWindowDays);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = analytics?.categories_breakdown || {};
  const verifications = analytics?.verification_breakdown || {};
  const priorities = analytics?.priority_breakdown || {};
  const statuses = analytics?.status_breakdown || {};
  const total = analytics?.total_reports || 0;

  return (
    <div className="space-y-6">
      {/* Header & Window Filter */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Operational Safety Analytics & Performance Indicators
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Jurisdictional metrics aggregated from verified database events ({analytics?.scope_name || 'Organization Scope'}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={timeWindowDays}
            onChange={(e) => setTimeWindowDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last 12 Months</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Computing verified analytics...
        </div>
      ) : (
        <>
          {/* Top Turnaround KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Avg Assignment Time</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {analytics?.resolution_metrics.avg_hours_to_assign !== null && analytics?.resolution_metrics.avg_hours_to_assign !== undefined
                  ? `${analytics.resolution_metrics.avg_hours_to_assign}h`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-500">
                Formula: (assigned_at − report.created_at) across assigned issues
              </p>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Avg Resolution Time</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {analytics?.resolution_metrics.avg_hours_to_resolve !== null && analytics?.resolution_metrics.avg_hours_to_resolve !== undefined
                  ? `${analytics.resolution_metrics.avg_hours_to_resolve}h`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-500">
                Formula: (resolved_at − assigned_at) for completed work orders
              </p>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Confirmation Rate</span>
                <CheckCircle className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {analytics?.resolution_metrics.resolution_confirmation_rate_pct !== null && analytics?.resolution_metrics.resolution_confirmation_rate_pct !== undefined
                  ? `${analytics.resolution_metrics.resolution_confirmation_rate_pct}%`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-500">
                Percentage of citizens confirming issue is remediated
              </p>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Issues Reopened</span>
                <RotateCcw className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {analytics?.resolution_metrics.reopened_count ?? 0}
              </div>
              <p className="text-[10px] text-slate-500">
                Disputed resolutions reopened for remedial action
              </p>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incident Category Distribution */}
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Hazard Categories Distribution
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">{total} total</span>
              </div>

              {Object.keys(categories).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No reports recorded.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categories).map(([cat, count]) => {
                    const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize text-slate-300">{cat.replace('_', ' ')}</span>
                          <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Verification Status Distribution */}
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Verification & Moderation Status
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">Audited Records</span>
              </div>

              {Object.keys(verifications).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No records available.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(verifications).map(([st, count]) => {
                    const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                    const barColor =
                      st === 'VERIFIED'
                        ? 'bg-emerald-500'
                        : st === 'PENDING'
                        ? 'bg-amber-500'
                        : st === 'REJECTED'
                        ? 'bg-rose-500'
                        : 'bg-purple-500';

                    return (
                      <div key={st} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{st}</span>
                          <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Priority & Status Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Work-Order Priority Distribution
              </h4>
              <div className="space-y-3">
                {Object.entries(priorities).map(([pr, count]) => {
                  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                  return (
                    <div key={pr} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{pr}</span>
                        <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Resolution Workflow Status
              </h4>
              <div className="space-y-3">
                {Object.entries(statuses).map(([st, count]) => {
                  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{st}</span>
                        <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Historical Trends Table */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Monthly Incident & Resolution Trends
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Total Reported</th>
                    <th className="py-2.5 px-3">Resolved Issues</th>
                    <th className="py-2.5 px-3">Clearance Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {(analytics?.monthly_trends || []).map((t) => {
                    const ratio = t.total_reports > 0 ? ((t.resolved_reports / t.total_reports) * 100).toFixed(1) : '100.0';
                    return (
                      <tr key={t.month} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{t.month}</td>
                        <td className="py-2.5 px-3">{t.total_reports}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{t.resolved_reports}</td>
                        <td className="py-2.5 px-3 text-cyan-400">{ratio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsView;
