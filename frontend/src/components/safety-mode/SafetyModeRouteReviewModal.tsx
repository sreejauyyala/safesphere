import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route,
  Navigation,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import routeService from '../../services/routeService';
import type { RouteAlternativeItem, RouteAlternativesResponse } from '../../types';

interface SafetyModeRouteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  originLat?: number | null;
  originLon?: number | null;
  destLat?: number | null;
  destLon?: number | null;
}

export const SafetyModeRouteReviewModal: React.FC<SafetyModeRouteReviewModalProps> = ({
  isOpen,
  onClose,
  originLat,
  originLon,
  destLat,
  destLon,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [routesResponse, setRoutesResponse] = useState<RouteAlternativesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!originLat || !originLon || !destLat || !destLon) {
      // Default to regional coordinates if user has no active destination
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    routeService
      .getRouteAlternatives({
        origin: { latitude: originLat, longitude: originLon },
        destination: { latitude: destLat, longitude: destLon },
        profile: 'walking',
        alternatives: true,
      })
      .then((data) => {
        if (!isMounted) return;
        setRoutesResponse(data);
        if (data.recommended_route_id) {
          setSelectedRouteId(data.recommended_route_id);
        } else if (data.routes && data.routes.length > 0) {
          setSelectedRouteId(data.routes[0].route_id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Route reassessment failed:', err);
        setError('Unable to fetch live route alternatives. Please check connection or view map.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, originLat, originLon, destLat, destLon]);

  if (!isOpen) return null;

  const formatDistance = (meters: number) => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Route className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Review Available Routes</h2>
            <p className="text-xs text-slate-400 font-medium">
              Step 10 safety-aware route alternatives & lower-estimated-risk guidance
            </p>
          </div>
        </div>

        {/* If no destination configured */}
        {(!destLat || !destLon) && (
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-300">
              No active destination detected for current session. You can plan or inspect alternative routes directly on the interactive map.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/map');
              }}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition inline-flex items-center gap-1.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Open Navigation Map</span>
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
            <p>Evaluating candidate route corridors with Safety Pulse intelligence...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Routes comparison list */}
        {routesResponse && routesResponse.routes && routesResponse.routes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
              <span>Candidate Routes ({routesResponse.routes.length})</span>
              <span>Evaluated with Step 9 Safety Pulse</span>
            </div>

            {routesResponse.routes.map((route: RouteAlternativeItem, idx: number) => {
              const isSelected = route.route_id === selectedRouteId;
              const isLowerRisk = route.route_type === 'lower_estimated_risk' || route.route_id === routesResponse.recommended_route_id;

              return (
                <div
                  key={route.route_id}
                  onClick={() => setSelectedRouteId(route.route_id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isLowerRisk
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isLowerRisk ? '★ Lower Estimated Risk' : `Option ${idx + 1}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {route.route_type_label || `Route ${idx + 1}`}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{formatDistance(route.distance_m)}</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        ~{formatDuration(route.duration_seconds)}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-indigo-300">
                      Pulse: {route.risk_assessment?.score ?? 'N/A'}/100
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
              {routesResponse.disclaimer}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/map');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>Navigate on Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SafetyModeRouteReviewModal;
