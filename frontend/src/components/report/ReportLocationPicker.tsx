import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Crosshair,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { useLocation, DEFAULT_COORDINATES } from '../../contexts/LocationContext';
import { GeocodingService } from '../../services/geocodingService';
import SafeSphereMap from '../map/SafeSphereMap';
import L from 'leaflet';

interface ReportLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  onSelectLocation: (lat: number, lon: number, label: string) => void;
  error?: string | null;
}

export const ReportLocationPicker: React.FC<ReportLocationPickerProps> = ({
  latitude,
  longitude,
  locationLabel,
  onSelectLocation,
  error,
}) => {
  const {
    currentLocation,
    requestLocation,
  } = useLocation();

  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Temporary selection state inside the modal
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tempLabel, setTempLabel] = useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Option A: Use Current GPS Location
  const handleUseCurrentLocation = async () => {
    setIsLoadingGPS(true);
    setGpsError(null);

    try {
      const coords = await requestLocation();
      const lat = coords?.latitude ?? currentLocation?.latitude ?? DEFAULT_COORDINATES.latitude;
      const lon = coords?.longitude ?? currentLocation?.longitude ?? DEFAULT_COORDINATES.longitude;

      const resolvedLabel = await GeocodingService.reverseGeocode(lat, lon);
      onSelectLocation(lat, lon, resolvedLabel);
    } catch {
      setGpsError('Location permission is required to attach your current location.');
    } finally {
      setIsLoadingGPS(false);
    }
  };

  // Option B: Open Interactive Map Picker Modal
  const handleOpenMapPicker = () => {
    setGpsError(null);
    setMapLoadError(null);
    setIsMapLoading(true);

    // If an incident location was already selected previously (e.g. editing report),
    // preserve that location. Otherwise, start with null so no fake location is pre-assigned.
    if (latitude !== null && longitude !== null) {
      setTempCoords({ lat: latitude, lng: longitude });
      setTempLabel(locationLabel || '');
    } else {
      setTempCoords(null);
      setTempLabel('');
    }

    setShowMapModal(true);
  };

  // Close modal without saving changes (preserves original report location)
  const handleCancelMapModal = () => {
    setShowMapModal(false);
    setTempCoords(null);
    setTempLabel('');
    setMapLoadError(null);
  };

  // User taps/clicks on the map to choose or move the incident marker
  const handleMapClick = async (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    setIsResolvingAddress(true);
    try {
      const address = await GeocodingService.reverseGeocode(lat, lng);
      setTempLabel(address);
    } catch {
      setTempLabel(`Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  // User confirms the selected location
  const handleConfirmMapSelection = () => {
    if (!tempCoords) return;
    const finalLabel = tempLabel.trim() || `Location (${tempCoords.lat.toFixed(4)}, ${tempCoords.lng.toFixed(4)})`;
    onSelectLocation(tempCoords.lat, tempCoords.lng, finalLabel);
    setShowMapModal(false);
  };

  // Map ready callback
  const handleMapReady = (map: L.Map) => {
    setMapInstance(map);
    setIsMapLoading(false);

    // Trigger multiple invalidation cycles to account for modal animation settling
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 60);

    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 200);

    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 450);
  };

  // Determine initial center:
  // 1. Existing report location (if set)
  // 2. Current detected GPS position (if available)
  // 3. Fallback center coordinates (DEFAULT_COORDINATES: Bangalore [12.9716, 77.5946])
  const initialCenter: [number, number] = (latitude !== null && longitude !== null)
    ? [latitude, longitude]
    : (currentLocation?.latitude && currentLocation?.longitude)
      ? [currentLocation.latitude, currentLocation.longitude]
      : [DEFAULT_COORDINATES.latitude, DEFAULT_COORDINATES.longitude];

  const hasSelectedLocation = latitude !== null && longitude !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">
          Incident Location <span className="text-rose-400">*</span>
        </label>
        <span className="text-xs text-slate-400">Attach GPS or pick on map</span>
      </div>

      {/* Two Selection Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option A: Use Current Location */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLoadingGPS}
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/60 hover:border-cyan-500/50 transition-all text-left flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 group-hover:scale-105 transition-transform">
            {isLoadingGPS ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-100 block">
              Use Current Location
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Auto-detect GPS & reverse address
            </span>
          </div>
        </button>

        {/* Option B: Choose Location on Map */}
        <button
          type="button"
          onClick={handleOpenMapPicker}
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/60 hover:border-cyan-500/50 transition-all text-left flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 group-hover:scale-105 transition-transform">
            <Crosshair className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-100 block">
              Choose on Map
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Tap anywhere on map to drop pin
            </span>
          </div>
        </button>
      </div>

      {/* Permission / GPS Error Message */}
      {gpsError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-amber-200 transition-colors shrink-0 ml-2"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Selected Location Card */}
      {hasSelectedLocation && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Location Selected ✓
              </span>
              <p className="text-sm font-medium text-slate-100 truncate mt-0.5">
                {locationLabel || 'Selected Coordinates'}
              </p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Lat: {latitude?.toFixed(5)}, Lon: {longitude?.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenMapPicker}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 px-2 py-1"
          >
            Change
          </button>
        </div>
      )}

      {error && !hasSelectedLocation && (
        <p className="text-xs text-rose-400 mt-1">{error}</p>
      )}

      {/* Interactive Map Picker Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  Select Hazard Location
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click or tap anywhere on the map to place the incident marker.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelMapModal}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Unavailable Notice (Requirement 9) */}
            {!currentLocation && (
              <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center gap-2 text-[11px] text-amber-300 shrink-0">
                <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Current location is unavailable. You can select a location manually.</span>
              </div>
            )}

            {/* Map Viewport Container with Guaranteed Explicit Dimensions (Requirement 3) */}
            <div className="relative w-full h-[380px] sm:h-[420px] min-h-[350px] bg-slate-950 overflow-hidden shrink-0">
              {/* Map Loading State Overlay (Requirement 9) */}
              {isMapLoading && (
                <div className="absolute inset-0 z-[1100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 text-slate-200 pointer-events-none">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs font-semibold tracking-wide">Loading location map...</span>
                </div>
              )}

              {/* Map Load Failed Alert (Requirement 9) */}
              {mapLoadError && (
                <div className="absolute top-4 left-4 right-4 z-[1200] p-3 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Unable to load the map. Check your connection or map configuration.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMapLoadError(null);
                      setIsMapLoading(true);
                      if (mapInstance) {
                        mapInstance.invalidateSize();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-white font-semibold text-[11px] shrink-0 transition"
                  >
                    Retry
                  </button>
                </div>
              )}

              <SafeSphereMap
                center={initialCenter}
                zoom={15}
                onMapClick={handleMapClick}
                customMarker={
                  tempCoords
                    ? {
                        latitude: tempCoords.lat,
                        longitude: tempCoords.lng,
                        label: isResolvingAddress ? 'Looking up address...' : tempLabel || 'Selected Incident Location',
                        icon: '📍',
                      }
                    : null
                }
                userLocation={currentLocation}
                showUserLocation={Boolean(currentLocation)}
                className="w-full h-[380px] sm:h-[420px] min-h-[350px]"
                showReports={false}
                showHelpPoints={false}
                showHotspots={false}
                onMapReady={handleMapReady}
              />
            </div>

            {/* Modal Footer with Selected Coordinates & Action Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              {/* Location Status Display (Requirement 9) */}
              <div className="text-xs text-slate-300 w-full sm:w-auto min-w-0">
                {tempCoords ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
                      <strong className="text-cyan-400 font-bold">Location selected:</strong>{' '}
                      <span className="font-mono text-slate-200 text-[11px]">
                        {tempCoords.lat.toFixed(5)}, {tempCoords.lng.toFixed(5)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                      {isResolvingAddress ? 'Looking up address...' : tempLabel || 'Hazard pin placed'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
                    <span>Click or tap anywhere on the map to place the incident marker.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons (Requirement 8) */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleCancelMapModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMapSelection}
                  disabled={!tempCoords || isResolvingAddress}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportLocationPicker;
