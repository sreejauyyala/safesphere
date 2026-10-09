import React from 'react';
import { ShieldCheck, Clock, Navigation, CheckCircle2, Play } from 'lucide-react';
import type { RouteAlternativeItem, RouteSortPriority } from '../../types';

export type { RouteSortPriority };

interface RouteSelectionControlsProps {
  priority: RouteSortPriority;
  onPriorityChange: (p: RouteSortPriority) => void;
  selectedRoute: RouteAlternativeItem | null;
  routesCount: number;
  onStartJourney: () => void;
  isStarting: boolean;
}

export const RouteSelectionControls: React.FC<RouteSelectionControlsProps> = ({
  priority,
  onPriorityChange,
  selectedRoute,
  routesCount,
  onStartJourney,
  isStarting,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Priority Sort Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Compare Criteria
          </span>
          <span className="text-xs text-slate-500">
            {routesCount} real route option{routesCount === 1 ? '' : 's'} calculated
          </span>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => onPriorityChange('safety')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              priority === 'safety'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Safety-Aware
          </button>

          <button
            type="button"
            onClick={() => onPriorityChange('time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              priority === 'time'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Fastest
          </button>

          <button
            type="button"
            onClick={() => onPriorityChange('distance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              priority === 'distance'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Shortest
          </button>
        </div>
      </div>

      {/* Start Journey Call to Action */}
      {selectedRoute && (
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Ready to travel via{' '}
              <strong className="text-white capitalize">
                {selectedRoute.route_type.replace(/_/g, ' ')}
              </strong>{' '}
              ({Math.round(selectedRoute.distance_m / 1000 * 10) / 10} km)
            </span>
          </div>

          <button
            type="button"
            onClick={onStartJourney}
            disabled={isStarting}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Initiating Journey...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Journey With Selected Route</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteSelectionControls;
