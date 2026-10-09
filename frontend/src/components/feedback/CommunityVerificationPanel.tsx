import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  RefreshCw,
  Copy,
  Info,
} from 'lucide-react';
import type {
  ReportItem,
  ReportCommunitySummary,
  FeedbackType,
  ReportAuditLogItem,
  VerificationStatusType,
  ReportStatusType,
} from '../../types';
import communityFeedbackService from '../../services/communityFeedbackService';
import ReportDisputeModal from './ReportDisputeModal';
import ResolutionConfirmationCard from './ResolutionConfirmationCard';
import { useAuth } from '../../contexts/AuthContext';

interface CommunityVerificationPanelProps {
  report: ReportItem;
  onReportUpdated?: (updatedReport: ReportItem) => void;
}

export const CommunityVerificationPanel: React.FC<CommunityVerificationPanelProps> = ({
  report,
  onReportUpdated,
}) => {
  const { userProfile } = useAuth();
  const [summary, setSummary] = useState<ReportCommunitySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState<boolean>(false);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<ReportAuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);
  const [nearbyDuplicates, setNearbyDuplicates] = useState<ReportItem[]>([]);

  // Moderator state
  const [showModeratorTools, setShowModeratorTools] = useState<boolean>(false);
  const [modVerificationStatus, setModVerificationStatus] = useState<VerificationStatusType>(
    (report.verification_status as VerificationStatusType) || 'PENDING'
  );
  const [modStatus, setModStatus] = useState<ReportStatusType>(
    (report.status as ReportStatusType) || 'OPEN'
  );
  const [modNotes, setModNotes] = useState<string>('');
  const [isModerating, setIsModerating] = useState<boolean>(false);

  const isAdmin = userProfile?.role === 'SYSTEM_ADMIN' || userProfile?.role === 'ORGANIZATION_ADMIN';
  const isOwner = userProfile?.id === report.user_id;

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await communityFeedbackService.getReportCommunitySummary(report.id);
      setSummary(data);
    } catch (err) {
      console.warn('Could not load community summary for report:', report.id, err);
    } finally {
      setIsLoading(false);
    }
  }, [report.id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Check for duplicate reports nearby
  useEffect(() => {
    const checkDuplicates = async () => {
      try {
        const dups = await communityFeedbackService.getReportDuplicates(report.id, 150);
        setNearbyDuplicates(dups);
      } catch {
        // Soft fail
      }
    };
    checkDuplicates();
  }, [report.id]);

  const loadAuditLogs = async () => {
    if (showAuditLogs) {
      setShowAuditLogs(false);
      return;
    }
    setIsLoadingAudit(true);
    try {
      const logs = await communityFeedbackService.getReportAuditLogs(report.id);
      setAuditLogs(logs);
      setShowAuditLogs(true);
    } catch {
      // Soft fail
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleVerificationFeedback = async (
    type: FeedbackType,
    concernCategory?: string,
    comment?: string
  ) => {
    setIsSubmitting(true);
    setFeedbackSuccess(null);
    try {
      const res = await communityFeedbackService.submitReportVerificationFeedback(report.id, {
        feedback_type: type,
        concern_category: concernCategory,
        comment: comment,
      });
      setSummary(res.summary);
      setFeedbackSuccess(
        type === 'CONFIRM_ISSUE'
          ? 'Observation recorded! Thank you for confirming this community hazard.'
          : 'Thank you. Your observation has been securely logged.'
      );
      setTimeout(() => setFeedbackSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Unable to record feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolutionFeedback = async (
    type: 'CONFIRM_RESOLVED' | 'REPORT_STILL_PRESENT',
    comment?: string
  ) => {
    setIsSubmitting(true);
    setFeedbackSuccess(null);
    try {
      const res = await communityFeedbackService.submitReportResolutionFeedback(report.id, {
        feedback_type: type,
        comment: comment,
      });
      setSummary(res.summary);
      setFeedbackSuccess(
        type === 'CONFIRM_RESOLVED'
          ? 'Resolution verified! Thank you for helping keep SafeSphere records accurate.'
          : 'Observation recorded. This issue has been flagged for reopening review.'
      );
      if (onReportUpdated && res.summary.status) {
        onReportUpdated({
          ...report,
          status: res.summary.status,
          verification_status: res.summary.verification_status,
        });
      }
      setTimeout(() => setFeedbackSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Unable to record feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModerating(true);
    try {
      const res = await communityFeedbackService.moderateReport(report.id, {
        new_status: modStatus,
        new_verification_status: isAdmin ? modVerificationStatus : undefined,
        review_notes: modNotes || undefined,
      });
      if (onReportUpdated) {
        onReportUpdated(res.report);
      }
      await loadSummary();
      setShowModeratorTools(false);
      setFeedbackSuccess('Moderation action completed and logged to audit trail.');
      setTimeout(() => setFeedbackSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to moderate report.');
    } finally {
      setIsModerating(false);
    }
  };

  // Dynamic question prompt based on category
  const getCategoryQuestion = () => {
    const cat = report.category.toLowerCase();
    if (cat.includes('lighting')) {
      return {
        question: 'Is this streetlight or area still unlit / not working?',
        confirmText: 'Yes, still not working',
        resolveText: 'It appears to be working',
      };
    }
    if (cat.includes('obstruction') || cat.includes('hazard') || cat.includes('damage')) {
      return {
        question: 'Is this physical hazard or obstruction still present?',
        confirmText: 'Yes, still present',
        resolveText: 'No, hazard is cleared',
      };
    }
    return {
      question: 'Have you independently observed this safety issue?',
      confirmText: 'Yes, I observed this issue',
      resolveText: 'The issue appears resolved',
    };
  };

  const catQuestion = getCategoryQuestion();
  const isReportResolved = report.status === 'RESOLVED' || summary?.status === 'RESOLVED';

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        {/* Header & Verification Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Community Verification</h3>
              <p className="text-[11px] text-slate-400">Independent citizen observations & audit trail</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Official Verification Badge */}
            {report.verification_status === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Officially Verified
              </span>
            ) : report.verification_status === 'COMMUNITY_SUPPORTED' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Community-Supported
              </span>
            ) : report.verification_status === 'DISPUTED' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Disputed
              </span>
            ) : report.verification_status === 'UNDER_REVIEW' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                Under Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
                Verification Pending
              </span>
            )}

            {/* Reopening / Resolution Disputed Banner */}
            {summary?.reopen_requested && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Reopen Requested
              </span>
            )}
          </div>
        </div>

        {/* Success Message Banner */}
        {feedbackSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
        )}

        {/* Community response counts */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Confirmations</span>
            <span className="text-sm font-bold text-slate-200">
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-slate-500" /> : (summary ? summary.confirm_count : 0)}
            </span>
            <span className="text-[10px] text-slate-400 block">confirm issue</span>
          </div>

          <div className="border-x border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Disputes</span>
            <span className={`text-sm font-bold ${summary && summary.dispute_count > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-slate-500" /> : (summary ? summary.dispute_count : 0)}
            </span>
            <span className="text-[10px] text-slate-400 block">dispute / concerns</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Resolved</span>
            <span className="text-sm font-bold text-emerald-400">
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-slate-500" /> : (summary ? summary.resolved_count : 0)}
            </span>
            <span className="text-[10px] text-slate-400 block">say resolved</span>
          </div>
        </div>

        {/* Duplicate reports alert if any */}
        {nearbyDuplicates.length > 0 && (
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-indigo-300 text-xs flex items-start gap-2">
            <Copy className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-200">Potential Duplicate Reports Nearby: </span>
              {nearbyDuplicates.length} other active reports in this category found within 150m.
            </div>
          </div>
        )}

        {/* Resolution Mode or Active Observation Mode */}
        {isReportResolved && summary ? (
          <ResolutionConfirmationCard
            summary={summary}
            categoryTitle={report.category}
            onConfirmResolved={() => handleResolutionFeedback('CONFIRM_RESOLVED')}
            onReportStillPresent={(comment) => handleResolutionFeedback('REPORT_STILL_PRESENT', comment)}
            isLoading={isSubmitting}
          />
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-slate-200">
              {catQuestion.question}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleVerificationFeedback('CONFIRM_ISSUE')}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-cyan-400" />
                {catQuestion.confirmText}
              </button>

              <button
                type="button"
                onClick={() => handleVerificationFeedback('CONFIRM_RESOLVED')}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {catQuestion.resolveText}
              </button>

              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(true)}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Flag a Concern
              </button>
            </div>
          </div>
        )}

        {/* One Vote Per User Notice */}
        {summary?.user_response && (
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              Your observation: <strong className="text-slate-200">{summary.user_response.feedback_type.replace(/_/g, ' ')}</strong>
              {summary.user_response.created_at && ` on ${new Date(summary.user_response.created_at).toLocaleDateString()}`}
            </span>
            <span className="text-cyan-400 text-[10px] font-semibold">1 active vote recorded (updatable)</span>
          </div>
        )}

        {/* Footer controls: Audit history toggle & Moderator tools */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={loadAuditLogs}
            className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            {showAuditLogs ? 'Hide Audit Trail' : `View Audit Trail (${summary?.audit_events_count || 0})`}
          </button>

          {(isAdmin || isOwner) && (
            <button
              type="button"
              onClick={() => setShowModeratorTools(!showModeratorTools)}
              className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {showModeratorTools ? 'Close Moderation' : 'Review / Moderate'}
            </button>
          )}
        </div>

        {/* Moderator Tools Section */}
        {showModeratorTools && (
          <form onSubmit={handleModerateSubmit} className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Authorized Review & Moderation Workflow
              </h4>
              <span className="text-[10px] text-slate-400">Actor: {userProfile?.role || 'Owner'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {isAdmin && (
                <div>
                  <label className="text-slate-400 block mb-1">Official Verification State</label>
                  <select
                    value={modVerificationStatus}
                    onChange={(e) => setModVerificationStatus(e.target.value as VerificationStatusType)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="COMMUNITY_SUPPORTED">COMMUNITY_SUPPORTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="VERIFIED">VERIFIED (Official)</option>
                    <option value="DISPUTED">DISPUTED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Report Lifecycle Status</label>
                <select
                  value={modStatus}
                  onChange={(e) => setModStatus(e.target.value as ReportStatusType)}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="RESOLUTION_DISPUTED">RESOLUTION_DISPUTED</option>
                  <option value="REOPENED">REOPENED</option>
                  {isAdmin && <option value="REJECTED">REJECTED</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-xs">Review Notes / Reason</label>
              <input
                type="text"
                value={modNotes}
                onChange={(e) => setModNotes(e.target.value)}
                placeholder="e.g. Field inspection confirmed repaired."
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isModerating}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {isModerating ? 'Applying Action...' : 'Save Moderation Decision'}
            </button>
          </form>
        )}

        {/* Audit Trail Drawer */}
        {showAuditLogs && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-200">Audit History Log</span>
              <span>Lightweight privacy-safe log</span>
            </div>
            {isLoadingAudit ? (
              <div className="py-3 text-center text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-cyan-400" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-slate-500 text-[11px] py-1">No recorded audit events yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <strong className="text-cyan-300">{log.action}</strong>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.reason && <p className="text-slate-400 text-[10px] mt-0.5">{log.reason}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      {log.new_status && <span>Status: {log.new_status}</span>}
                      {log.new_verification_status && <span>Verification: {log.new_verification_status}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      <ReportDisputeModal
        isOpen={isDisputeModalOpen}
        reportId={report.id}
        onClose={() => setIsDisputeModalOpen(false)}
        onSubmit={async (type, concernCat, comment) => {
          await handleVerificationFeedback(type, concernCat, comment);
        }}
      />
    </div>
  );
};

export default CommunityVerificationPanel;
