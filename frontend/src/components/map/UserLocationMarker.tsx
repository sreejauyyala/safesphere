import React from 'react';
import type { LocationCoordinates } from '../../types';

export interface UserLocationMarkerProps {
  location: LocationCoordinates | null;
  showAccuracy?: boolean;
}

/**
 * Metadata / visual summary component for user location marker state.
 */
export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  location,
  showAccuracy = true,
}) => {
  if (!location) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
      <span>
        Live: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
      </span>
      {showAccuracy && location.accuracy && (
        <span className="text-[10px] text-slate-400">±{Math.round(location.accuracy)}m</span>
      )}
    </div>
  );
};

export default UserLocationMarker;
