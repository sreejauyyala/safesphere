import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, Send } from 'lucide-react';
import type { FeedbackType } from '../../types';

interface ReportDisputeModalProps {
  isOpen: boolean;
  reportId: string;
  onClose: () => void;
  onSubmit: (feedbackType: FeedbackType, concernCategory: string, comment: string) => Promise<void>;
}

const DISPUTE_OPTIONS = [
  {
    type: 'INACCURATE_LOCATION' as FeedbackType,
    categoryKey: 'wrong_location',
    label: 'Wrong Location',
    description: 'The pinned location does not match where the issue actually is.',
  },
  {
    type: 'INACCURATE_CATEGORY' as FeedbackType,
    categoryKey: 'incorrect_category',
    label: 'Incorrect Category',
    description: 'The issue is misclassified (e.g. general lighting instead of road hazard).',
  },
  {
    type: 'DISPUTE_ISSUE' as FeedbackType,
    categoryKey: 'issue_no_longer_present',
    label: 'Issue No Longer Present',
    description: 'The condition has already cleared or was never present.',
  },
  {
    type: 'DUPLICATE_REPORT' as FeedbackType,
    categoryKey: 'duplicate_report',
    label: 'Duplicate Report',
    description: 'An identical safety report already exists for this exact location.',
  },
  {
    type: 'GENERAL_FEEDBACK' as FeedbackType,
    categoryKey: 'inaccurate_description',
    label: 'Description Inaccurate / Misleading',
    description: 'The factual details do not match the real-world condition.',
  },
];

export const ReportDisputeModal: React.FC<ReportDisputeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opt = DISPUTE_OPTIONS[selectedIdx];
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(opt.type, opt.categoryKey, comment.trim());
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Report an Accuracy Concern</h3>
              <p className="text-xs text-slate-400">Help keep SafeSphere information factual and accurate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              What concern do you have regarding this report?
            </label>
            <div className="space-y-2">
              {DISPUTE_OPTIONS.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.type}
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    selectedIdx === idx
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-100">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Factual Explanation <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. This report appears to refer to 4th Cross street, not this corner."
              rows={3}
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
            <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
              <span>Factual details help authorized reviewers calibrate safety status</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-cyan-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Privacy guarantee: Your name, phone, and account will not be exposed publicly.</span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportDisputeModal;
