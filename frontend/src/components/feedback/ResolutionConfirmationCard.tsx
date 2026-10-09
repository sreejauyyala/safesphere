import React, { useState } from 'react';
import { CheckCircle2, AlertOctagon, Send } from 'lucide-react';
import type { ReportCommunitySummary } from '../../types';

interface ResolutionConfirmationCardProps {
  summary: ReportCommunitySummary;
  categoryTitle: string;
  onConfirmResolved: () => Promise<void>;
  onReportStillPresent: (comment: string) => Promise<void>;
  isLoading?: boolean;
}

export const ResolutionConfirmationCard: React.FC<ResolutionConfirmationCardProps> = ({
  summary,
  categoryTitle,
  onConfirmResolved,
  onReportStillPresent,
  isLoading = false,
}) => {
  const [showStillPresentInput, setShowStillPresentInput] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const handleResolvedClick = async () => {
    setSubmittingAction('RESOLVED');
    try {
      await onConfirmResolved();
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleStillPresentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction('STILL_PRESENT');
    try {
      await onReportStillPresent(comment.trim());
      setShowStillPresentInput(false);
      setComment('');
    } finally {
      setSubmittingAction(null);
    }
  };

  const isDisputed = summary.status === 'RESOLUTION_DISPUTED' || summary.reopen_requested;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isDisputed
        ? 'bg-amber-950/20 border-amber-500/40'
        : 'bg-emerald-950/20 border-emerald-500/30'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isDisputed ? (
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              {isDisputed ? 'Resolution Contested by Community' : 'Issue Marked Resolved'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {isDisputed
                ? 'Community observations indicate this issue may still be active. Reopening review pending.'
                : `This ${categoryTitle.toLowerCase()} was reported as repaired/resolved.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            {summary.resolved_count} verified fixed
          </span>
          {summary.still_present_count > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {summary.still_present_count} still present
            </span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80">
        <p className="text-xs font-semibold text-slate-200 mb-2.5">
          Have you confirmed that this issue is genuinely resolved?
        </p>

        {!showStillPresentInput ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleResolvedClick}
              disabled={isLoading || !!submittingAction}
              className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {submittingAction === 'RESOLVED' ? 'Recording...' : 'Yes, it is resolved'}
            </button>

            <button
              type="button"
              onClick={() => setShowStillPresentInput(true)}
              disabled={isLoading || !!submittingAction}
              className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              No, issue is still present
            </button>
          </div>
        ) : (
          <form onSubmit={handleStillPresentSubmit} className="space-y-2.5 animate-in fade-in">
            <p className="text-[11px] text-amber-300 font-medium">
              Please share a brief observation explaining why this issue still persists:
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Light was flickering yesterday and is now completely unlit again."
              rows={2}
              maxLength={400}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-amber-500/40 text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStillPresentInput(false)}
                className="py-1.5 px-3 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !!submittingAction}
                className="py-1.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingAction === 'STILL_PRESENT' ? 'Submitting...' : 'Submit Observation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResolutionConfirmationCard;
