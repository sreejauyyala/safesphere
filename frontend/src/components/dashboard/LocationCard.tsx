import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useLocation } from '../../contexts/LocationContext';
import LocationPermissionModal from '../location/LocationPermissionModal';

export interface LocationCardProps {
  className?: string;
}

export const LocationCard: React.FC<LocationCardProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { currentLocation, accuracy, isLocationEnabled, error, permissionStatus } = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  const handleEnableClick = () => {
    setModalOpen(true);
  };

  const handleViewOnMap = () => {
    navigate('/map');
  };

  return (
    <>
      <Card
        variant="card"
        className={`relative ${className}`}
        icon={<MapPin className="w-5 h-5 text-indigo-400" />}
        title="Your Current Location"
        subtitle="GPS positioning & telemetry"
      >
        <div className="space-y-4">
          {isLocationEnabled && currentLocation ? (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                  📍 Location detected
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  🟢 Location Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1">
                <div>
                  <span className="block text-[11px] text-slate-500">Latitude</span>
                  <span className="font-mono text-slate-200 text-xs">
                    {currentLocation.latitude.toFixed(4)}° N
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">Longitude</span>
                  <span className="font-mono text-slate-200 text-xs">
                    {currentLocation.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>

              {accuracy !== null && (
                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px]">Accuracy:</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    ± {Math.round(accuracy)} meters
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Position Status:</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Location permission required
                </span>
              </div>
              {error && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              )}
              {permissionStatus === 'denied' && (
                <p className="text-[11px] text-slate-400">
                  Access denied in browser settings. Please enable GPS permissions to track journeys.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              SafeSphere only tracks live location when you explicitly start a journey.
            </p>

            {isLocationEnabled ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewOnMap}
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                View on Map
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnableClick}
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                Enable Location
              </Button>
            )}
          </div>
        </div>
      </Card>

      <LocationPermissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default LocationCard;
