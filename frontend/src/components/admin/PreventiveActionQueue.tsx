import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Clock, 
  ShieldAlert, 
  UserPlus, 
  Wrench, 
  RefreshCw, 
  CheckCircle 
} from 'lucide-react';
import type { PreventiveActionQueueItem, Organization, ReportAdminItem } from '../../types';
import adminService from '../../services/adminService';
import IssueAssignmentModal from './IssueAssignmentModal';
import IssueResolutionModal from './IssueResolutionModal';

interface PreventiveActionQueueProps {
  organizations: Organization[];
  currentOrgId?: string | null;
  isSystemAdmin: boolean;
  onRefreshParent: () => void;
}

export const PreventiveActionQueue: React.FC<PreventiveActionQueueProps> = ({
  organizations,
  currentOrgId,
  isSystemAdmin,
  onRefreshParent,
}) => {
  const [items, setItems] = useState<PreventiveActionQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReportForAssign, setSelectedReportForAssign] = useState<ReportAdminItem | null>(null);
  const [selectedReportForResolve, setSelectedReportForResolve] = useState<ReportAdminItem | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await adminService.getActionQueue(25);
      setItems(data);
    } catch (err) {
      console.error('Failed to load action queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenAssign = async (item: PreventiveActionQueueItem) => {
    try {
      const report = await adminService.getReport(item.report_id);
      setSelectedReportForAssign(report);
    } catch (err) {
      console.error('Failed to fetch report detail', err);
    }
  };

  const handleOpenResolve = async (item: PreventiveActionQueueItem) => {
    try {
      const report = await adminService.getReport(item.report_id);
      setSelectedReportForResolve(report);
    } catch (err) {
      console.error('Failed to fetch report detail', err);
    }
  };

  const handleSuccess = () => {
    fetchQueue();
    onRefreshParent();
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            Deterministic Preventive Action Queue
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked mathematically using verified hazard severity, aging decay, community disputes, and overdue remediation deadlines.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Queue List */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Calculating deterministic priorities...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500/80 mx-auto" />
            <p className="text-xs text-slate-300 font-semibold">Priority Action Queue Clear</p>
            <p className="text-[11px] text-slate-500">
              No unresolved safety hazards or overdue remediation orders in current organizational jurisdiction.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {items.map((item, idx) => {
              const isUrgent = item.priority_score >= 150;
              const isHigh = item.priority_score >= 100 && item.priority_score < 150;
              const scoreChipStyle = isUrgent
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                : isHigh
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-950/80 border-slate-800 text-slate-300';

              return (
                <div
                  key={item.report_id}
                  className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Rank, Score & Title */}
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Rank & Priority Score */}
                    <div className={`flex flex-col items-center justify-center shrink-0 w-12 h-12 rounded-xl border text-center ${scoreChipStyle}`}>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">RANK</span>
                      <span className="text-base font-black leading-none">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{item.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400">
                          {item.category}
                        </span>
                        {item.is_overdue && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            OVERDUE
                          </span>
                        )}
                        {item.is_disputed && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            DISPUTED
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Score: <strong className="font-mono text-rose-300">{item.priority_score}</strong></span>
                        <span>•</span>
                        <span>Age: {item.age_hours.toFixed(0)}h</span>
                        <span>•</span>
                        <span>Severity: {item.severity}</span>
                        {item.assigned_org_name && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400">{item.assigned_org_name}</span>
                          </>
                        )}
                      </p>

                      <div className="text-[10px] text-slate-500 bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-800/80">
                        {item.reason_summary}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenAssign(item)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-semibold transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{item.assignment_status === 'UNASSIGNED' ? 'Assign' : 'Reassign'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenResolve(item)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-xs font-semibold transition-all"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {selectedReportForAssign && (
        <IssueAssignmentModal
          report={selectedReportForAssign}
          organizations={organizations}
          currentOrgId={currentOrgId}
          isSystemAdmin={isSystemAdmin}
          onClose={() => setSelectedReportForAssign(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Resolution Modal */}
      {selectedReportForResolve && (
        <IssueResolutionModal
          report={selectedReportForResolve}
          onClose={() => setSelectedReportForResolve(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default PreventiveActionQueue;
