import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Route,
  BellRing,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { LocationCoordinates } from '../../types';

interface SafetyModeActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { notifyTrustedContacts: boolean; userNote?: string }) => Promise<void>;
  currentLocation: LocationCoordinates | null;
  activeJourneyDestination?: string | null;
  isStarting?: boolean;
}

export const SafetyModeActivationModal: React.FC<SafetyModeActivationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentLocation,
  activeJourneyDestination,
  isStarting = false,
}) => {
  const [notifyContacts, setNotifyContacts] = useState(true);
  const [userNote, setUserNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      notifyTrustedContacts: notifyContacts,
      userNote: userNote.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">I Feel Unsafe</h2>
            <p className="text-xs text-rose-300/80 font-medium">
              Activate preventive safety assistance
            </p>
          </div>
        </div>

        {/* Explanation Banner */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-200">
            Activate preventive safety support for your current journey.
          </p>
          <p className="text-slate-400">
            SafeSphere can display nearby verified help points, help you review available routes, and notify your selected trusted contacts when contact notifications are configured.
          </p>
          <div className="pt-1 text-[11px] text-amber-300/90 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Preventive assistance is discrete and does not trigger loud sirens.</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2.5">
            <MapPin className={`w-4 h-4 shrink-0 ${currentLocation ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">GPS Status</span>
              <span className="font-semibold text-slate-300 truncate">
                {currentLocation
                  ? `Lat: ${currentLocation.latitude.toFixed(3)}, Lon: ${currentLocation.longitude.toFixed(3)}`
                  : 'Permission Requested'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2.5">
            <Route className="w-4 h-4 shrink-0 text-indigo-400" />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Journey Link</span>
              <span className="font-semibold text-slate-300 truncate">
                {activeJourneyDestination ? `Active: ${activeJourneyDestination}` : 'Standalone Location Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Notification Option & Context Note */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={notifyContacts}
              onChange={(e) => setNotifyContacts(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-400" />
                Notify Configured Trusted Contacts & Guardians
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sends discrete preventive alert with your location when notification services are configured.
              </p>
            </div>
          </label>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Optional Context / Note
            </label>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="e.g. Streetlights out, feeling followed, or unfamiliar transit stop..."
              rows={2}
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isStarting}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isStarting}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activate Safety Mode</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SafetyModeActivationModal;
