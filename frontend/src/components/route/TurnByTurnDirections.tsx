import React from 'react';
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCw,
  GitFork,
  MapPin,
  Flag,
  Navigation,
  Compass,
} from 'lucide-react';
import type { TurnByTurnStep } from '../../types';

interface TurnByTurnDirectionsProps {
  steps: TurnByTurnStep[];
  totalDistanceM: number;
  totalDurationSeconds: number;
  className?: string;
}

export const TurnByTurnDirections: React.FC<TurnByTurnDirectionsProps> = ({
  steps,
  totalDistanceM,
  totalDurationSeconds,
  className = '',
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div className={`p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 ${className}`}>
        <Navigation className="w-5 h-5 mx-auto text-slate-500 mb-1" />
        <span>Step-by-step guidance is not available for this route corridor.</span>
      </div>
    );
  }

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  const getManeuverIcon = (maneuver: string = '', modifier: string = '') => {
    const m = (maneuver || '').toLowerCase();
    const mod = (modifier || '').toLowerCase();

    if (m === 'arrive') return <Flag className="w-4 h-4 text-emerald-400" />;
    if (m === 'depart') return <MapPin className="w-4 h-4 text-blue-400" />;
    if (m === 'roundabout' || m === 'rotary') return <RotateCw className="w-4 h-4 text-indigo-400" />;
    if (m === 'fork') return <GitFork className="w-4 h-4 text-amber-400" />;

    if (mod.includes('left') || m.includes('left')) {
      return <CornerUpLeft className="w-4 h-4 text-sky-400" />;
    }
    if (mod.includes('right') || m.includes('right')) {
      return <CornerUpRight className="w-4 h-4 text-sky-400" />;
    }
    if (m === 'continue' || m === 'straight' || mod === 'straight') {
      return <ArrowUp className="w-4 h-4 text-emerald-400" />;
    }

    return <Compass className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary Header */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>Turn-by-Turn Directions ({steps.length} steps)</span>
        </span>
        <span className="text-slate-400 font-medium">
          {formatDistance(totalDistanceM)} &bull; {formatDuration(totalDurationSeconds)}
        </span>
      </div>

      {/* Step by Step List */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        {steps.map((step, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition border ${
                isLast
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : isFirst
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 shrink-0">
                {getManeuverIcon(step.maneuver_type, step.modifier || '')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 leading-snug">
                  {step.instruction}
                </div>
                {step.road_name && (
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    Onto <span className="text-slate-300 font-medium">{step.road_name}</span>
                  </div>
                )}
                {step.distance_m > 0 && !isLast && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Continue for {formatDistance(step.distance_m)}
                    {step.duration_seconds > 0 && ` (~${formatDuration(step.duration_seconds)})`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TurnByTurnDirections;
