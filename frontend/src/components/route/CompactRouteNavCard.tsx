import React from 'react';
import {
  ShieldCheck,
  Clock,
  Navigation,
  Eye,
  CheckCircle2,
  Play,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { RouteAlternativeItem } from '../../types';

interface CompactRouteNavCardProps {
  route: RouteAlternativeItem;
  isSelected: boolean;
  isRecommended: boolean;
  onSelectRoute: (routeId: string) => void;
  onViewRoute: (routeId: string) => void;
  onStartJourney: (route: RouteAlternativeItem) => void;
  onClose?: () => void;
  className?: string;
  isStarting?: boolean;
}

export const CompactRouteNavCard: React.FC<CompactRouteNavCardProps> = ({
  route,
  isSelected,
  isRecommended,
  onSelectRoute,
  onViewRoute,
  onStartJourney,
  onClose,
  className = '',
  isStarting = false,
}) => {
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

  const assessment = route.safety_assessment || route.risk_assessment;
  const isInsufficient = assessment?.status === 'insufficient_data' || (assessment?.data_coverage ?? 0) < 0.20 || assessment?.color === 'grey';

  const coveragePercent = Math.round((assessment?.data_coverage ?? 0) * 100);

  // Recommendation Badge text
  const getRecommendationBadge = () => {
    if (isInsufficient) {
      return {
        text: 'GREY — Insufficient Safety Data',
        bg: 'bg-slate-700/25 border-slate-600/30 text-slate-300',
        icon: AlertTriangle,
      };
    }
    if (assessment?.color === 'green' || route.route_type === 'lower_estimated_risk' || isRecommended) {
      return {
        text: 'GREEN — Lower Estimated Risk',
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        icon: ShieldCheck,
      };
    }
    if (assessment?.color === 'yellow') {
      return {
        text: 'YELLOW — Moderate Estimated Risk',
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        icon: AlertTriangle,
      };
    }
    if (assessment?.color === 'red') {
      return {
        text: 'RED — Higher Estimated Risk',
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        icon: AlertTriangle,
      };
    }
    if (route.route_type === 'fastest') {
      return {
        text: 'Fastest Alternative Route',
        bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
        icon: Clock,
      };
    }
    return {
      text: 'Alternative Route Option',
      bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
      icon: Navigation,
    };
  };

  const badgeMeta = getRecommendationBadge();
  const BadgeIcon = badgeMeta.icon;

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 sm:p-5 transition-all text-slate-100 ${
        isSelected
          ? 'border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-emerald-900/20'
          : 'border-slate-700/80 hover:border-slate-600'
      } ${className}`}
    >
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeMeta.bg}`}
          >
            <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{badgeMeta.text}</span>
          </span>

          {isSelected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Active on Map
            </span>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close card"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 border-y border-slate-800 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Distance
          </span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {formatDistance(route.distance_m)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Estimated Time
          </span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {formatDuration(route.duration_seconds)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Safety Assessment
          </span>
          <span
            className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${
              isInsufficient
                ? 'text-amber-400'
                : assessment.risk_level === 'lower'
                ? 'text-emerald-400'
                : 'text-yellow-400'
            }`}
          >
            {isInsufficient
              ? 'Unavailable'
              : `${assessment.risk_level.toUpperCase()} (${assessment.score ?? 'N/A'}/100)`}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Data Confidence
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-semibold capitalize text-slate-200">
              {assessment.confidence} ({coveragePercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Top Signals Preview (if available) */}
      {route.strongest_signals.length > 0 && (
        <div className="mt-2.5 space-y-1">
          <div className="text-[11px] text-slate-400">
            Signal: <span className="text-slate-200">{route.strongest_signals[0].description}</span>
          </div>
        </div>
      )}

      {/* Disclaimer Line */}
      <div className="mt-2 text-[10px] text-slate-500 italic">
        "Route safety assessments are estimates based on available information. They do not guarantee safety or predict crime."
      </div>

      {/* Action Buttons: [View Route] [Select Route] [Start Journey] */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onViewRoute(route.route_id)}
          className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
          title="Fit route to map viewport"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>View Route</span>
        </button>

        {!isSelected ? (
          <button
            type="button"
            onClick={() => onSelectRoute(route.route_id)}
            className="py-2 px-3.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Select Route</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="py-2 px-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Selected</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onStartJourney(route)}
          disabled={isStarting}
          className="py-2 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
        >
          {isStarting ? (
            <>
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Starting...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Journey</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CompactRouteNavCard;
