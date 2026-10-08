import React from 'react';
import { useLocation } from '../../contexts/LocationContext';
import { MapPin, AlertCircle, Shield, X } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted?: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onGranted,
}) => {
  const { requestLocation, error, permissionStatus } = useLocation();

  if (!isOpen) return null;

  const handleAllow = async () => {
    const coords = await requestLocation();
    if (coords) {
      if (onGranted) onGranted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
            <MapPin className="w-8 h-8 animate-bounce" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Location Access Needed</h3>

          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            SafeSphere needs your location to provide journey tracking and safety features.
          </p>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 w-full mb-5 flex items-start gap-3 text-left">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              SafeSphere only tracks live location when you explicitly start an active journey.
              Your location is not shared publicly.
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 w-full mb-5 flex items-start gap-2.5 text-left">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200">{error}</p>
            </div>
          )}

          {permissionStatus === 'denied' && !error && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 w-full mb-5 flex items-start gap-2.5 text-left">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                Location access is disabled. Please enable location permission in your browser or
                device settings.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleAllow}
              className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98]"
            >
              Allow Location
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
