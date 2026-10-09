import React, { useState } from 'react';
import { X, Flame, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import type { TrustedContact } from '../../types';

interface SOSActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  contacts: TrustedContact[];
}

export const SOSActivationModal: React.FC<SOSActivationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contacts,
}) => {
  const { currentLocation } = useLocation();
  const { userProfile, isMinor } = useAuth();
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const eligibleContacts = contacts.filter(
    (c) => c.verification_status === 'VERIFIED' && c.permissions?.notify_sos
  );

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await onConfirm(emergencyNotes.trim() || undefined);
      onClose();
    } catch {
      // Handled in parent
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Flame className="w-8 h-8 animate-pulse text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">SOS EMERGENCY</h2>
            <p className="text-xs text-red-300 font-bold">
              Do you need to alert your trusted contacts?
            </p>
          </div>
        </div>

        {/* Explanation Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/30 text-xs text-slate-300 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-100">
            Activating SOS will dispatch high-priority emergency notifications to authorized recipients:
          </p>
          <div className="space-y-1.5 pt-1">
            {eligibleContacts.length > 0 ? (
              eligibleContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="font-semibold text-slate-200">{c.contact_name || c.name} ({c.relationship || 'Contact'})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.permissions?.share_live_location
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {c.permissions?.share_live_location ? 'Live Location Included' : 'Location Withheld'}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-amber-400 font-semibold block text-[11px]">No verified contacts configured for SOS notifications yet.</span>
            )}

            {isMinor && userProfile?.guardian && (
              <div className="flex items-center justify-between text-[11px] bg-purple-950/40 px-2.5 py-1.5 rounded-lg border border-purple-500/30">
                <span className="font-semibold text-purple-200">
                  Guardian: {userProfile.guardian.guardian_name} ({userProfile.guardian.relationship})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase">
                  {userProfile.guardian.verification_status}
                </span>
              </div>
            )}
          </div>
          <div className="pt-1 text-[11px] text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Does not automatically call 911 / 112 emergency services. One-tap dialing will be available.</span>
          </div>
        </div>

        {/* GPS Status */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>GPS Location Status:</span>
          </span>
          <span className="font-semibold text-slate-200">
            {currentLocation ? (
              `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} (±${Math.round(currentLocation.accuracy || 10)}m)`
            ) : (
              <span className="text-amber-400">Requesting coordinates...</span>
            )}
          </span>
        </div>

        {/* Optional Context Note */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Emergency Note (Optional)
          </label>
          <input
            type="text"
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            placeholder="e.g. Followed near bus terminal, unlit street..."
            maxLength={250}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isActivating}
            className="flex-1 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={isActivating}
            className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs tracking-wider uppercase shadow-xl shadow-red-950/50 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activating SOS...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>ACTIVATE SOS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSActivationModal;
