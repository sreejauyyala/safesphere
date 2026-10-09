import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertOctagon,
  Moon,
  Bike,
} from 'lucide-react';
import type { RouteAlternativeItem } from '../../types';

interface RouteComparisonCardProps {
  route: RouteAlternativeItem;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (routeId: string) => void;
  onHighlight: (routeId: string) => void;
}

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  route,
  isSelected,
  isRecommended,
  onSelect,
  onHighlight,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

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

  // Harmonize safety assessment data (support both safety_assessment and risk_assessment)
  const assessment = route.safety_assessment || route.risk_assessment;
  const score = assessment?.score ?? null;
  const coveragePercent = Math.round((assessment?.data_coverage ?? 0) * 100);
  const colorCategory = assessment?.color || (score !== null ? (score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red') : 'grey');

  // Colour & Classification configuration
  const getColorMeta = () => {
    switch (colorCategory) {
      case 'green':
        return {
          name: 'GREEN',
          label: 'Lower Estimated Risk',
          hex: '#16A34A',
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-500',
          borderClass: isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-emerald-500/10' : 'border-emerald-500/30 hover:border-emerald-500/60',
          icon: ShieldCheck,
        };
      case 'yellow':
        return {
          name: 'YELLOW',
          label: 'Moderate Estimated Risk',
          hex: '#EAB308',
          badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-500',
          borderClass: isSelected ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-amber-500/10' : 'border-amber-500/30 hover:border-amber-500/60',
          icon: AlertTriangle,
        };
      case 'red':
        return {
          name: 'RED',
          label: 'Higher Estimated Risk',
          hex: '#DC2626',
          badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dotClass: 'bg-rose-500',
          borderClass: isSelected ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-rose-500/10' : 'border-rose-500/30 hover:border-rose-500/60',
          icon: AlertOctagon,
        };
      default:
        return {
          name: 'GREY',
          label: 'Insufficient Safety Data',
          hex: '#64748B',
          badgeClass: 'bg-slate-700/25 text-slate-300 border-slate-600/30',
          dotClass: 'bg-slate-500',
          borderClass: isSelected ? 'border-slate-500 ring-2 ring-slate-500/40 shadow-slate-500/10' : 'border-slate-800 hover:border-slate-700',
          icon: Info,
        };
    }
  };

  const colorMeta = getColorMeta();
  const ColorIcon = colorMeta.icon;

  const relevantIssues = route.relevant_issues || [];
  const distinctCount = route.distinct_verified_issues_count ?? relevantIssues.length;

  return (
    <div
      onClick={() => onHighlight(route.route_id)}
      className={`rounded-2xl transition-all border p-4 sm:p-5 relative cursor-pointer bg-slate-900/90 shadow-xl ${colorMeta.borderClass}`}
    >
      {/* Top Header: Route Colour & Risk Classification */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${colorMeta.badgeClass}`}
          >
            <ColorIcon className="w-3.5 h-3.5 shrink-0" />
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0 shadow-sm"
              style={{ backgroundColor: colorMeta.hex }}
            />
            <span>{colorMeta.name} — {colorMeta.label}</span>
          </span>

          {isRecommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              Recommended
            </span>
          )}

          {route.route_type_label && (
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
              via {route.route_type_label.replace('Route via ', '')}
            </span>
          )}
        </div>

        {isSelected && (
          <span className="text-xs font-bold text-blue-400 flex items-center gap-1 shrink-0 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selected
          </span>
        )}
      </div>

      {/* Primary Metrics Grid: Actual Distance, Travel Time, Safety Score */}
      <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800/80 bg-slate-950/40 rounded-xl px-3 my-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Distance
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-100">
            {formatDistance(route.distance_m)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Travel Time
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            {formatDuration(route.duration_seconds)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Safety Score
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="text-xs sm:text-sm font-extrabold px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: `${colorMeta.hex}20`,
                borderColor: `${colorMeta.hex}50`,
                color: colorMeta.hex,
              }}
            >
              {score !== null ? `${score}/100` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Safety Data Coverage & Verified Issues Summary */}
      <div className="mt-2.5 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <span>Verified Issues:</span>
            <span className={`font-bold ${distinctCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {distinctCount === 0 ? '0 verified issues' : `${distinctCount} verified issue${distinctCount > 1 ? 's' : ''}`}
            </span>
          </span>

          <span className="text-slate-400 text-[11px]">
            Coverage: <span className="text-slate-200 font-semibold">{coveragePercent}%</span> ({assessment?.confidence || 'insufficient'} confidence)
          </span>
        </div>

        {/* Coverage Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/50">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(coveragePercent, 6)}%`,
              backgroundColor: colorMeta.hex,
            }}
          />
        </div>
      </div>

      {/* Insufficient Data Warning Callout */}
      {colorCategory === 'grey' && (
        <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <div className="space-y-0.5 leading-relaxed">
            <div className="font-bold text-slate-200">Insufficient Safety Data</div>
            <div className="text-[11px] text-slate-400">
              Civic safety observations cover only {coveragePercent}% of this road corridor. SafeSphere does not assume unmonitored routes are safe.
            </div>
          </div>
        </div>
      )}

      {/* Expandable "Why this route?" Section */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowExplanation(!showExplanation);
          }}
          className="w-full flex items-center justify-between text-xs font-semibold text-blue-400 hover:text-blue-300 py-1 transition"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Why this route received its colour?
          </span>
          {showExplanation ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showExplanation && (
          <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
            {/* Plain-Language Factual Explanation */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Safety Assessment Summary
              </span>
              <p className="text-slate-200 leading-relaxed text-xs">
                {route.explanation || 'Safety conditions evaluated against verified community safety reports and monitored corridors.'}
              </p>
            </div>

            {/* List of Relevant Verified Issues */}
            {relevantIssues.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Identified Corridor Issues ({relevantIssues.length}):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {relevantIssues.map((iss, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col gap-1 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                iss.severity === 'CRITICAL' || iss.severity === 'HIGH'
                                  ? '#DC2626'
                                  : iss.severity === 'MEDIUM'
                                  ? '#EAB308'
                                  : '#10B981',
                            }}
                          />
                          {iss.category_label}
                        </span>

                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                          {Math.round(iss.distance_from_route_m)}m away
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-tight">
                        {iss.description}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[10px] text-slate-400">
                        {iss.mode_relevance && (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            {iss.mode_relevance}
                          </span>
                        )}
                        {iss.is_night_factor && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Moon className="w-3 h-3" />
                            Night factor
                          </span>
                        )}
                        {iss.created_at && (
                          <span className="text-slate-500">
                            Reported {new Date(iss.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : coveragePercent >= 20 ? (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>No verified unresolved hazards identified within the 300m assessed corridor.</span>
              </div>
            ) : null}

            {/* Assessment Limitations */}
            {route.limitations && route.limitations.length > 0 && (
              <div className="space-y-1 border-t border-slate-900 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Limitations & Methodology
                </span>
                <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                  {route.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls: [View Route] [Select Route] */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight(route.route_id);
          }}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          View Route
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(route.route_id);
          }}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
            isSelected
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isSelected ? 'Route Selected' : 'Select Route'}
        </button>
      </div>
    </div>
  );
};

export default RouteComparisonCard;
