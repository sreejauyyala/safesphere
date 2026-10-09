import React, { useState } from 'react';
import { X, UserPlus, Calendar, AlertCircle } from 'lucide-react';
import type { ReportAdminItem, Organization, AssignmentPriority } from '../../types';
import adminService from '../../services/adminService';

interface IssueAssignmentModalProps {
  report: ReportAdminItem | null;
  organizations: Organization[];
  currentOrgId?: string | null;
  isSystemAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IssueAssignmentModal: React.FC<IssueAssignmentModalProps> = ({
  report,
  organizations,
  currentOrgId,
  isSystemAdmin,
  onClose,
  onSuccess,
}) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    report?.assigned_organization_id || currentOrgId || (organizations[0]?.id ?? '')
  );
  const [priority, setPriority] = useState<AssignmentPriority>('MEDIUM');
  const [actionDescription, setActionDescription] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setError('Please select a responsible organization.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await adminService.createAssignment({
        report_id: report.id,
        organization_id: selectedOrgId,
        priority,
        action_description: actionDescription.trim() || undefined,
        target_resolution_at: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Failed to create issue assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl glass-card border border-slate-700/80 p-6 space-y-5 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Assign Safety Issue</h3>
              <p className="text-xs text-slate-400">Delegate remediation responsibility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issue Brief */}
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
          {/* Organization Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Responsible Organization *
            </label>
            {isSystemAdmin && organizations.length > 0 ? (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                required
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.org_type})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                disabled
                value={organizations.find((o) => o.id === selectedOrgId)?.name || 'My Organization'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
              />
            )}
          </div>

          {/* Action Priority */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Remediation Priority *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as AssignmentPriority[]).map((p) => {
                const isSelected = priority === p;
                const colors: Record<AssignmentPriority, string> = {
                  LOW: 'border-slate-700 text-slate-400 hover:border-slate-600',
                  MEDIUM: 'border-blue-700 text-blue-400 hover:border-blue-600',
                  HIGH: 'border-amber-700 text-amber-400 hover:border-amber-600',
                  URGENT: 'border-rose-700 text-rose-400 hover:border-rose-600',
                };
                const activeColors: Record<AssignmentPriority, string> = {
                  LOW: 'bg-slate-700/60 border-slate-500 text-slate-200',
                  MEDIUM: 'bg-blue-600/30 border-blue-500 text-blue-200',
                  HIGH: 'bg-amber-600/30 border-amber-500 text-amber-200',
                  URGENT: 'bg-rose-600/30 border-rose-500 text-rose-200',
                };

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                      isSelected ? activeColors[p] : colors[p]
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Note: Work-priority is distinct from user-reported severity.
            </p>
          </div>

          {/* Action Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Action Plan / Work Order
            </label>
            <textarea
              rows={3}
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              placeholder="e.g. Inspect lamp pole #14, replace ballast or faulty wiring..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Target Resolution Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Resolution Date (Optional)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Actions */}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueAssignmentModal;
