import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export interface LocationCardProps {
  onEnableLocation?: () => void;
  className?: string;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  onEnableLocation,
  className = '',
}) => {
  const [requested, setRequested] = useState(false);

  const handleRequest = () => {
    setRequested(true);
    if (onEnableLocation) {
      onEnableLocation();
    }
  };

  return (
    <Card
      variant="card"
      className={`relative ${className}`}
      icon={<MapPin className="w-5 h-5 text-indigo-400" />}
      title="Your Current Area"
      subtitle="Autonomous geo-fence protection"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Position:</span>
            <span className="font-semibold text-slate-200">
              {requested ? 'Simulated Area (Metro Core)' : 'Location permission required'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Telemetry Status:</span>
            <span className={`font-semibold flex items-center gap-1.5 ${
              requested ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {requested ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready for Live GPS (Step 5)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Waiting for location access</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            SafeSphere respects your privacy. Geolocation is used solely during active travel or emergency mode.
          </p>

          <Button
            variant={requested ? 'outline' : 'secondary'}
            size="sm"
            onClick={handleRequest}
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            {requested ? 'Access Configured' : 'Enable Location'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default LocationCard;
