import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import type { MapMarkerData } from '../types';
import { MapPin, ArrowLeft, Navigation, ShieldAlert, Crosshair } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import LocationPermissionModal from '../components/location/LocationPermissionModal';

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentLocation,
    accuracy,
    isLocationEnabled,
    permissionStatus,
    isTracking,
    error,
  } = useLocation();

  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);

  // Default fallback if GPS is not yet acquired
  const fallbackLat = 12.9716;
  const fallbackLng = 77.5946;

  const activeLat = currentLocation?.latitude ?? fallbackLat;
  const activeLng = currentLocation?.longitude ?? fallbackLng;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home Dashboard</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-500" />
            Live GPS & SafeSphere Map
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS positioning with accuracy telemetry and live journey breadcrumbs.
          </p>
        </div>

        {/* GPS Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isLocationEnabled && currentLocation ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                GPS Active {accuracy ? `(±${Math.round(accuracy)}m)` : ''}
              </span>
              <button
                type="button"
                onClick={() => setFollowUser(!followUser)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                  followUser
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                {followUser ? 'Following' : 'Follow Me'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPermissionModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              Enable Live GPS
            </button>
          )}

          {isTracking && (
            <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Journey Tracking ON
            </span>
          )}
        </div>
      </div>

      {/* Permission / Status Alert Banner */}
      {!isLocationEnabled && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">
                {permissionStatus === 'denied'
                  ? 'Location access is disabled in browser settings'
                  : 'Live GPS Location Required'}
              </p>
              <p className="text-slate-400 text-[11px]">
                {permissionStatus === 'denied'
                  ? 'Please enable location permissions in your browser or device settings to center the map on your position.'
                  : 'SafeSphere needs your location to provide journey tracking and safety features.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPermissionModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shrink-0 transition"
          >
            Allow Location
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-300 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Map Component Container */}
      <div className="relative">
        <Map
          latitude={activeLat}
          longitude={activeLng}
          accuracy={accuracy}
          zoom={15}
          followUser={followUser}
          showCurrentLocation={isLocationEnabled}
          showRecenterButton={isLocationEnabled}
          className="h-[540px] w-full"
          onMarkerClick={(marker) => setSelectedMarker(marker)}
        />
      </div>

      {/* Selected Marker Detail Card */}
      {selectedMarker && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between text-xs">
          <div>
            <h4 className="font-bold text-white text-sm">{selectedMarker.title}</h4>
            <p className="text-slate-400 mt-0.5">{selectedMarker.description}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Lat: {selectedMarker.latitude.toFixed(5)}, Lng: {selectedMarker.longitude.toFixed(5)}
            </p>
          </div>
          <button
            onClick={() => setSelectedMarker(null)}
            className="text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      )}

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
      />
    </div>
  );
};

export default MapPage;
