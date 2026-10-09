import React from 'react';
import type { MapSafetyReport } from '../../types';

export interface SafetyReportMarkerProps {
  report: MapSafetyReport;
  onClick?: (report: MapSafetyReport) => void;
}

export const SafetyReportMarker: React.FC<SafetyReportMarkerProps> = ({ report, onClick }) => {
  return (
    <div
      onClick={() => onClick && onClick(report)}
      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">
          {report.category === 'poor_lighting'
            ? '💡'
            : report.category === 'road_damage'
            ? '🛣️'
            : report.category === 'road_obstruction'
            ? '🚧'
            : report.category === 'isolated_area'
            ? '👥'
            : report.category === 'transport_issue'
            ? '🚌'
            : '⚠️'}
        </span>
        <div>
          <h5 className="font-semibold text-white leading-tight">{report.title}</h5>
          <span className="text-[10px] text-slate-400 capitalize">{report.category.replace('_', ' ')}</span>
        </div>
      </div>
      <span
        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
          report.severity === 'critical'
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }`}
      >
        {report.severity}
      </span>
    </div>
  );
};

export default SafetyReportMarker;
