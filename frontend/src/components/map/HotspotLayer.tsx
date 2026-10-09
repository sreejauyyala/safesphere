import React from 'react';
import type { MapHotspot } from '../../types';

export interface HotspotLayerProps {
  hotspots: MapHotspot[];
  visible?: boolean;
}

export const HotspotLayer: React.FC<HotspotLayerProps> = ({ hotspots, visible = true }) => {
  if (!visible || hotspots.length === 0) return null;

  return (
    <div className="space-y-1.5 text-xs">
      {hotspots.map((h) => (
        <div
          key={h.id}
          className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-amber-200">{h.label}</span>
          </div>
          <span className="text-[10px] text-slate-400">{Math.round(h.radius)}m radius</span>
        </div>
      ))}
    </div>
  );
};

export default HotspotLayer;
