import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

export const MapLegend: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    { symbol: '🔵', label: 'Your Location', color: 'text-blue-400' },
    { symbol: '💡', label: 'Lighting Issue', color: 'text-amber-400' },
    { symbol: '🚧', label: 'Road Obstruction', color: 'text-yellow-400' },
    { symbol: '🛣️', label: 'Road Damage', color: 'text-orange-400' },
    { symbol: '👥', label: 'Isolated Passage', color: 'text-purple-400' },
    { symbol: '🚌', label: 'Transport Issue', color: 'text-sky-400' },
    { symbol: '⚠️', label: 'General Hazard', color: 'text-rose-400' },
    { symbol: '👮', label: 'Police Station', color: 'text-blue-300' },
    { symbol: '🏥', label: '24/7 Hospital / ER', color: 'text-red-300' },
    { symbol: '🛡️', label: 'Security Desk', color: 'text-cyan-300' },
    { symbol: '📍', label: 'Verified Safe Haven', color: 'text-emerald-300' },
    { symbol: '🟠', label: 'Safety Concern Area', color: 'text-amber-500' },
  ];

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl text-xs overflow-hidden transition-all ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-slate-200 hover:text-white transition font-semibold"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Map Legend</span>
        </span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-slate-800/80 grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto animate-fade-in">
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="text-xs shrink-0">{item.symbol}</span>
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapLegend;
