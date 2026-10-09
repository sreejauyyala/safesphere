import React, { useState, useEffect } from 'react';
import { Navigation, ArrowUpDown, AlertCircle } from 'lucide-react';
import DestinationSearch from './DestinationSearch';
import TransportModeSelector, { type TransportProfile } from './TransportModeSelector';
import type { RouteCoordinates } from '../../types';
import { useLocation } from '../../contexts/LocationContext';

interface OriginDestinationFormProps {
  origin: RouteCoordinates | null;
  destination: RouteCoordinates | null;
  profile: TransportProfile;
  onOriginChange: (coords: RouteCoordinates | null) => void;
  onDestinationChange: (coords: RouteCoordinates | null) => void;
  onProfileChange: (profile: TransportProfile) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const OriginDestinationForm: React.FC<OriginDestinationFormProps> = ({
  origin,
  destination,
  profile,
  onOriginChange,
  onDestinationChange,
  onProfileChange,
  onSubmit,
  isLoading,
  error,
}) => {
  const { currentLocation, requestLocation } = useLocation();
  const [useCurrentLoc, setUseCurrentLoc] = useState(true);

  // Sync current location to origin when enabled
  useEffect(() => {
    if (useCurrentLoc && currentLocation) {
      onOriginChange({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        label: 'My Current Location',
      });
    }
  }, [useCurrentLoc, currentLocation]);

  const handleUseCurrentLocation = async () => {
    setUseCurrentLoc(true);
    let loc = currentLocation;
    if (!loc) {
      loc = await requestLocation();
    }
    if (loc) {
      onOriginChange({
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: 'My Current Location',
      });
    }
  };

  const handleSwap = () => {
    if (origin && destination) {
      const prevOrigin = { ...origin };
      const prevDest = { ...destination };
      setUseCurrentLoc(false);
      onOriginChange(prevDest);
      onDestinationChange(prevOrigin);
    }
  };

  const canSubmit = origin && destination && !isLoading;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Travel Profile Selector */}
      <TransportModeSelector
        selectedProfile={profile}
        onChange={onProfileChange}
        disabled={isLoading}
      />

      {/* Origin & Destination Inputs */}
      <div className="space-y-3 relative">
        {/* Origin */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Starting Point
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                useCurrentLoc && origin?.label === 'My Current Location'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-800/50'
              }`}
            >
              <Navigation className="w-3 h-3" />
              Use My Location
            </button>
          </div>

          {useCurrentLoc && origin?.label === 'My Current Location' ? (
            <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200">
              <div className="flex items-center gap-2 truncate">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-100">My Current Location</span>
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                  ({origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUseCurrentLoc(false)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium ml-2"
              >
                Change
              </button>
            </div>
          ) : (
            <DestinationSearch
              placeholder="Search origin address or landmark..."
              value={origin}
              onSelect={(coords) => {
                setUseCurrentLoc(false);
                onOriginChange(coords);
              }}
            />
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1 z-10 relative">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!origin || !destination}
            className="p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition disabled:opacity-30 disabled:pointer-events-none"
            title="Swap Origin and Destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination */}
        <div>
          <DestinationSearch
            label="Destination"
            placeholder="Search destination place, street or landmark..."
            value={destination}
            onSelect={(coords) => onDestinationChange(coords)}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Submit Action */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>Evaluating Road Safety Signals...</span>
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            <span>Compare Safe Routes</span>
          </>
        )}
      </button>
    </div>
  );
};

export default OriginDestinationForm;
