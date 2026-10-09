import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import type { ReportAdminItem } from '../../types';
import adminService from '../../services/adminService';

interface IssueResolutionModalProps {
  report: ReportAdminItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const IssueResolutionModal: React.FC<IssueResolutionModalProps> = ({
  report,
  onClose,
  onSuccess,
}) => {
  const [actionTaken, setActionTaken] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionTaken.trim().length < 5) {
      setError('Please provide a specific description of the corrective action taken (at least 5 characters).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await adminService.submitResolution(report.id, {
        action_taken: actionTaken.trim(),
        resolution_notes: resolutionNotes.trim() || undefined,
        assignment_id: report.active_assignment_id || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Failed to submit issue resolution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl glass-card border border-slate-700/80 p-6 space-y-5 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Submit Corrective Action</h3>
              <p className="text-xs text-slate-400">Record formal remediation & mark resolved</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issue Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">{report.title}</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px]">
              {report.category}
            </span>
          </div>
          <p className="text-slate-400 line-clamp-2">{report.description}</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Corrective Action Executed *
            </label>
            <textarea
              rows={3}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="e.g. Replaced faulty 150W fixture on light pole #14 with new LED luminaire; verified illumination output."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 resize-none"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Factual description of work completed by your team.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Resolution Notes / Preventive Measures (Optional)
            </label>
            <textarea
              rows={2}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Scheduled for 60-day preventive maintenance inspection."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
            ℹ️ Marking this resolved triggers the Community Confirmation Period. Citizens in the vicinity can confirm or dispute the resolution.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Mark Officially Resolved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueResolutionModal;
