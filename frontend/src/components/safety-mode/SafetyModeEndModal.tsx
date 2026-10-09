import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, X, Loader2 } from 'lucide-react';

interface SafetyModeEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { deactivationReason: string; userNote?: string }) => Promise<void>;
  isEnding?: boolean;
}

export const SafetyModeEndModal: React.FC<SafetyModeEndModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isEnding = false,
}) => {
  const [reason, setReason] = useState('user_safe');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      deactivationReason: reason,
      userNote: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">End Safety Mode</h2>
            <p className="text-xs text-slate-400 font-medium">
              Confirm you have arrived safely
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Are you sure you want to end Safety Mode? Deactivating will stand down preventive watchdog telemetry. If you have an active journey running, it will continue independently.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Status Confirmation
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="user_safe">I am safe / Arrived safely</option>
              <option value="false_alarm">Activated by accident</option>
              <option value="with_trusted_person">Met with family / friend</option>
              <option value="other">Other reason</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Optional Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. In my apartment, thank you."
              maxLength={255}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isEnding}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
            >
              Continue Safety Mode
            </button>
            <button
              type="submit"
              disabled={isEnding}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isEnding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ending...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>End Safety Mode</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SafetyModeEndModal;
