import React, { useState } from 'react';
import { X, ShieldCheck, Loader2 } from 'lucide-react';

interface SOSEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const SOSEndModal: React.FC<SOSEndModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Situation resolved safely');
  const [isEnding, setIsEnding] = useState(false);

  if (!isOpen) return null;

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await onConfirm(reason);
      onClose();
    } catch {
      // Handled in parent
    } finally {
      setIsEnding(false);
    }
  };

  const reasonOptions = [
    'Situation resolved safely',
    'Reached safe haven / Police assistance arrived',
    'Met with trusted friend / family member',
    'Accidental activation — I am safe',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
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
            <h2 className="text-xl font-black text-white tracking-tight">End SOS Emergency?</h2>
            <p className="text-xs text-slate-400 font-medium">
              Confirm you are safe and conclude this emergency alert session
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-200">Session resolution update:</p>
          <p className="text-slate-400 text-[11px]">
            Previously alerted contacts will receive an update confirming you have ended the emergency state. Any independent active journeys will remain active.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Deactivation Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition"
          >
            {reasonOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isEnding}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Continue SOS
          </button>
          <button
            type="button"
            onClick={handleEnd}
            disabled={isEnding}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isEnding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ending SOS...</span>
              </>
            ) : (
              <span>End SOS</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSEndModal;
