import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Flag, 
  UserPlus, 
  Wrench, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Volume2,
  Image as ImageIcon
} from 'lucide-react';
import type { ReportAdminItem, Organization } from '../../types';
import adminService from '../../services/adminService';
import IssueAssignmentModal from './IssueAssignmentModal';
import IssueResolutionModal from './IssueResolutionModal';

interface ReportManagementTableProps {
  reports: ReportAdminItem[];
  total: number;
  loading: boolean;
  organizations: Organization[];
  currentOrgId?: string | null;
  isSystemAdmin: boolean;
  filters: {
    category: string;
    severity: string;
    verification_status: string;
    status: string;
    search: string;
    page: number;
    limit: number;
  };
  onFilterChange: (key: string, value: any) => void;
  onRefresh: () => void;
}

export const ReportManagementTable: React.FC<ReportManagementTableProps> = ({
  reports,
  total,
  loading,
  organizations,
  currentOrgId,
  isSystemAdmin,
  filters,
  onFilterChange,
  onRefresh,
}) => {
  const [selectedReportForAssign, setSelectedReportForAssign] = useState<ReportAdminItem | null>(null);
  const [selectedReportForResolve, setSelectedReportForResolve] = useState<ReportAdminItem | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleVerify = async (reportId: string) => {
    setActionInProgress(reportId);
    try {
      await adminService.verifyReport(reportId, 'Officially verified by authorized administrator.');
      onRefresh();
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (reportId: string) => {
    const reason = window.prompt('Enter reason for rejecting this report:');
    if (!reason) return;
    setActionInProgress(reportId);
    try {
      await adminService.rejectReport(reportId, reason);
      onRefresh();
    } catch (err) {
      console.error('Rejection failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleFlag = async (reportId: string) => {
    setActionInProgress(reportId);
    try {
      await adminService.flagReport(reportId, 'Flagged for extended review.');
      onRefresh();
    } catch (err) {
      console.error('Flagging failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const totalPages = Math.ceil(total / filters.limit) || 1;

  const severityBadge = (sev: string) => {
    const map: Record<string, string> = {
      LOW: 'bg-slate-800 text-slate-300 border-slate-700',
      MEDIUM: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
      HIGH: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
      CRITICAL: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[sev] || map.LOW}`}>
        {sev}
      </span>
    );
  };

  const verificationBadge = (v: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
      VERIFIED: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
      REJECTED: 'bg-slate-800 text-slate-400 border-slate-700',
      DISPUTED: 'bg-purple-950/40 text-purple-300 border-purple-800/40',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[v] || map.PENDING}`}>
        {v}
      </span>
    );
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      OPEN: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      INVESTIGATING: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      RESOLVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      DISMISSED: 'text-slate-400 bg-slate-800 border-slate-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[s] || map.OPEN}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search reports by title, description or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="poor_lighting">Poor Lighting</option>
            <option value="road_damage">Road Damage</option>
            <option value="road_obstruction">Road Obstruction</option>
            <option value="isolated_area">Isolated Area</option>
            <option value="transport_issue">Transport Issue</option>
            <option value="general_safety">General Safety</option>
            <option value="other">Other</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) => onFilterChange('severity', e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {/* Verification Status */}
          <select
            value={filters.verification_status}
            onChange={(e) => onFilterChange('verification_status', e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Verifications</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="DISPUTED">Disputed</option>
          </select>

          {/* Issue Status */}
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating / In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Issue / Title</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Verification</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Community Signals</th>
                <th className="py-3 px-3">Assignment</th>
                <th className="py-3 px-4 text-right">Moderation & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading scoped safety reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No safety reports found matching active criteria.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isExpanded = expandedReportId === report.id;
                  const isBusy = actionInProgress === report.id;

                  return (
                    <React.Fragment key={report.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        {/* Title & Category */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100 line-clamp-1">{report.title}</span>
                            {report.has_image && <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                            {report.has_voice && <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono">{report.category}</span>
                            <span>•</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="py-3.5 px-3">
                          {severityBadge(report.severity)}
                        </td>

                        {/* Verification */}
                        <td className="py-3.5 px-3">
                          {verificationBadge(report.verification_status)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {statusBadge(report.status)}
                        </td>

                        {/* Community Feedback Signals */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3 text-[11px]">
                            <div className="flex items-center gap-1 text-emerald-400" title="Independent Confirmations">
                              <ThumbsUp className="w-3 h-3" />
                              <span>{report.community_confirmations}</span>
                            </div>
                            <div className="flex items-center gap-1 text-rose-400" title="Report Disputes">
                              <ThumbsDown className="w-3 h-3" />
                              <span>{report.community_disputes}</span>
                            </div>
                            {report.resolution_disputes > 0 && (
                              <div className="flex items-center gap-1 text-purple-400 font-bold" title="Resolution Disputes">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{report.resolution_disputes}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Assignment */}
                        <td className="py-3.5 px-3 text-[11px]">
                          {report.assigned_organization_name ? (
                            <div>
                              <span className="font-medium text-slate-200 block truncate max-w-[130px]">
                                {report.assigned_organization_name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {report.assignment_status || 'ASSIGNED'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Moderation / Action */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Verify Action */}
                            {report.verification_status !== 'VERIFIED' && (
                              <button
                                onClick={() => handleVerify(report.id)}
                                disabled={isBusy}
                                title="Officially Verify"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reject Action */}
                            {report.verification_status !== 'REJECTED' && (
                              <button
                                onClick={() => handleReject(report.id)}
                                disabled={isBusy}
                                title="Reject Report"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Flag Action */}
                            <button
                              onClick={() => handleFlag(report.id)}
                              disabled={isBusy}
                              title="Flag for Review"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                            >
                              <Flag className="w-4 h-4" />
                            </button>

                            {/* Assign Action */}
                            <button
                              onClick={() => setSelectedReportForAssign(report)}
                              title="Assign Organization / Responder"
                              className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>

                            {/* Resolve Action */}
                            {report.status !== 'RESOLVED' && (
                              <button
                                onClick={() => setSelectedReportForResolve(report)}
                                title="Submit Corrective Action & Resolve"
                                className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 transition-colors"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle Details */}
                            <button
                              onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                              title={isExpanded ? 'Hide Details' : 'View Details & Evidence'}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-900/40">
                          <td colSpan={7} className="p-4 border-t border-slate-800/80">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Description & Location */}
                              <div className="space-y-2">
                                <h4 className="font-bold text-slate-300">Incident Narrative</h4>
                                <p className="text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                  {report.description}
                                </p>
                                <div className="text-[11px] text-slate-500">
                                  <span>Coordinates: </span>
                                  <span className="font-mono text-slate-400">
                                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                                  </span>
                                </div>
                              </div>

                              {/* Evidence Media & Transcripts */}
                              <div className="space-y-2">
                                <h4 className="font-bold text-slate-300">Attached Evidence</h4>
                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2 min-h-[90px]">
                                  {report.image_url && (
                                    <div>
                                      <span className="text-[10px] text-slate-500 block mb-1">Image Evidence:</span>
                                      <img
                                        src={report.image_url}
                                        alt="Report attachment"
                                        className="h-24 w-auto rounded-lg object-cover border border-slate-800"
                                      />
                                    </div>
                                  )}
                                  {report.voice_transcript && (
                                    <div>
                                      <span className="text-[10px] text-slate-500 block mb-1">Voice Transcript:</span>
                                      <p className="text-slate-300 italic text-[11px] bg-slate-900 p-2 rounded-lg">
                                        "{report.voice_transcript}"
                                      </p>
                                    </div>
                                  )}
                                  {!report.image_url && !report.voice_transcript && (
                                    <span className="text-slate-500 italic text-[11px]">
                                      No multimodal media attachments provided.
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* AI Analysis & Compliance Info */}
                              <div className="space-y-2">
                                <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>AI Analysis & Privacy</span>
                                </h4>
                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                                  {report.ai_analysis ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">AI Suggested Category:</span>
                                        <span className="text-indigo-400 font-mono">
                                          {(report.ai_analysis as any).suggested_category || 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">AI Confidence:</span>
                                        <span className="text-slate-300 font-mono">
                                          {(report.ai_analysis as any).confidence_score
                                            ? `${((report.ai_analysis as any).confidence_score * 100).toFixed(0)}%`
                                            : 'N/A'}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 italic">No AI telemetry data logged.</span>
                                  )}
                                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                                    🔒 Privacy Guard: Reporter telephone, personal email, and guardian identity are strictly protected and redacted from administrative views.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {reports.length} of {total} reports (Page {filters.page} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFilterChange('page', Math.max(1, filters.page - 1))}
              disabled={filters.page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">{filters.page}</span>
            <button
              onClick={() => onFilterChange('page', Math.min(totalPages, filters.page + 1))}
              disabled={filters.page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedReportForAssign && (
        <IssueAssignmentModal
          report={selectedReportForAssign}
          organizations={organizations}
          currentOrgId={currentOrgId}
          isSystemAdmin={isSystemAdmin}
          onClose={() => setSelectedReportForAssign(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Resolution Modal */}
      {selectedReportForResolve && (
        <IssueResolutionModal
          report={selectedReportForResolve}
          onClose={() => setSelectedReportForResolve(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};

export default ReportManagementTable;
