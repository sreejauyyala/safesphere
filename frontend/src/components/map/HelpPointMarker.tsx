import React from 'react';
import type { MapHelpPoint } from '../../types';

export interface HelpPointMarkerProps {
  helpPoint: MapHelpPoint;
  onClick?: (point: MapHelpPoint) => void;
}

export const HelpPointMarker: React.FC<HelpPointMarkerProps> = ({ helpPoint, onClick }) => {
  return (
    <div
      onClick={() => onClick && onClick(helpPoint)}
      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">
          {helpPoint.type === 'police_station'
            ? '👮'
            : helpPoint.type === 'hospital'
            ? '🏥'
            : helpPoint.type === 'security_desk' || helpPoint.type === 'campus_security'
            ? '🛡️'
            : '📍'}
        </span>
        <div>
          <h5 className="font-semibold text-white leading-tight">{helpPoint.name}</h5>
          <span className="text-[10px] text-slate-400">{helpPoint.address}</span>
        </div>
      </div>
      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
        Verified
      </span>
    </div>
  );
};

export default HelpPointMarker;
