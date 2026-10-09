import React, { useState } from 'react';
import {
  Navigation,
  ArrowUpDown,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import DestinationSearch from './DestinationSearch';
import TransportModeSelector, { type TransportProfile } from './TransportModeSelector';
import TurnByTurnDirections from './TurnByTurnDirections';
import RouteComparisonCard from './RouteComparisonCard';
import type {
  RouteCoordinates,
  RouteAlternativeItem,
  RouteAlternativesResponse,
} from '../../types';
import { useLocation } from '../../contexts/LocationContext';

interface NavigationPanelProps {
  origin: RouteCoordinates | null;
  destination: RouteCoordinates | null;
  profile: TransportProfile;
  candidateRoutes: RouteAlternativeItem[];
  selectedRouteId: string | null;
  isLoading: boolean;
  error: string | null;
  responseMeta: RouteAlternativesResponse | null;
  onOriginChange: (coords: RouteCoordinates | null) => void;
  onDestinationChange: (coords: RouteCoordinates | null) => void;
  onProfileChange: (newProfile: TransportProfile) => void;
  onSelectRoute: (routeId: string) => void;
  onViewRoute?: (routeId: string) => void;
  onStartJourney: (route: RouteAlternativeItem) => void;
  onReset: () => void;
  isStartingJourney?: boolean;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  origin,
  destination,
  profile,
  candidateRoutes,
  selectedRouteId,
  isLoading,
  error,
  responseMeta,
  onOriginChange,
  onDestinationChange,
  onProfileChange,
  onSelectRoute,
  onViewRoute,
  onStartJourney,
  onReset,
  isStartingJourney = false,
  className = '',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentLocation, requestLocation } = useLocation();
  const [useCurrentLoc, setUseCurrentLoc] = useState(true);
  const [showDirections, setShowDirections] = useState(true);
  const [showSafetySignals, setShowSafetySignals] = useState(false);

  // Active selected route
  const selectedRoute =
    candidateRoutes.find((r) => r.route_id === selectedRouteId) ||
    candidateRoutes[0] ||
    null;

  const handleUseCurrentLocation = async () => {
    setUseCurrentLoc(true);
    let loc = currentLocation;
    if (!loc) {
      loc = await requestLocation();
    }
    if (loc) {
      onOriginChange({
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: 'My Current Location',
      });
    }
  };

  const handleSwap = () => {
    if (origin && destination) {
      const prevOrigin = { ...origin };
      const prevDest = { ...destination };
      setUseCurrentLoc(false);
      onOriginChange(prevDest);
      onDestinationChange(prevOrigin);
    }
  };

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl flex flex-col text-slate-100 transition-all ${className}`}
    >
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>SafeSphere Navigation</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Real street routes with Safety Pulse risk telemetry
            </p>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold"
            title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(88vh-80px)] custom-scrollbar">
          {/* 1. Origin & Destination Inputs with Swap */}
          <div className="space-y-2.5">
            {/* Origin */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Starting Point
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                    useCurrentLoc && origin?.label === 'My Current Location'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white bg-slate-800/60'
                  }`}
                >
                  <Navigation className="w-2.5 h-2.5" />
                  My Location
                </button>
              </div>

              {useCurrentLoc && origin?.label === 'My Current Location' ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-slate-100">My Current Location</span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      ({origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCurrentLoc(false)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold ml-2"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <DestinationSearch
                  placeholder="Enter starting location or landmark..."
                  value={origin}
                  onSelect={(coords) => {
                    setUseCurrentLoc(false);
                    onOriginChange(coords);
                  }}
                />
              )}
            </div>

            {/* Swap Origin / Destination Button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button
                type="button"
                onClick={handleSwap}
                disabled={!origin || !destination}
                className="p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition disabled:opacity-30 disabled:pointer-events-none shadow-md"
                title="Swap origin and destination"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Destination */}
            <div>
              <DestinationSearch
                label="Destination"
                placeholder="Where do you want to go?"
                value={destination}
                onSelect={(coords) => onDestinationChange(coords)}
              />
            </div>
          </div>

          {/* 2. Transport Selector (Car, Scooty/Motorcycle, Bicycle, Walking) */}
          <TransportModeSelector
            selectedProfile={profile}
            onChange={onProfileChange}
            disabled={isLoading}
          />

          {/* 3. Loading State Indicator */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center gap-3 text-xs text-blue-300 animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold">Calculating street-by-street route for {profile.replace(/_/g, ' ')}...</span>
            </div>
          )}

          {/* 4. Error State */}
          {error && !isLoading && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold text-rose-200">Routing Notice: </span>
                {error}
              </div>
            </div>
          )}

          {/* 5. Route Results and Alternatives */}
          {!isLoading && candidateRoutes.length > 0 && selectedRoute && (
            <div className="space-y-3.5">
              {/* Safety Recommendation Banner */}
              {responseMeta?.recommendation_status === 'recommended' && responseMeta.recommendation_reason && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-200">Recommended Route: </span>
                    {responseMeta.recommendation_reason}
                  </div>
                </div>
              )}

              {responseMeta?.recommendation_status === 'insufficient_data' && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-200">Limited Comparative Data: </span>
                    Safety comparison based on available community reports.
                  </div>
                </div>
              )}

              {/* Two-Wheeler Advisory Disclaimer (Section 4 Requirement) */}
              {profile === 'two_wheeler' && selectedRoute.two_wheeler_disclaimer && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{selectedRoute.two_wheeler_disclaimer}</span>
                </div>
              )}

              {/* Alternative Route Tabs / Cards */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Available Routes ({candidateRoutes.length})
                </span>

                <div className="space-y-3">
                  {candidateRoutes.map((route) => (
                    <RouteComparisonCard
                      key={route.route_id}
                      route={route}
                      isSelected={route.route_id === selectedRouteId}
                      isRecommended={responseMeta?.recommended_route_id === route.route_id}
                      onSelect={(id) => onSelectRoute(id)}
                      onHighlight={(id) => {
                        onSelectRoute(id);
                        onViewRoute?.(id);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 6. Primary Action: Start Journey */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onStartJourney(selectedRoute)}
                  disabled={isStartingJourney}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                >
                  {isStartingJourney ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Starting GPS Commute...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Journey with Selected Route</span>
                    </>
                  )}
                </button>
              </div>

              {/* 7. Turn-by-Turn Directions Expandable Accordion */}
              {selectedRoute.steps && selectedRoute.steps.length > 0 && (
                <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() => setShowDirections(!showDirections)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                      <span>Turn-by-Turn Guidance ({selectedRoute.steps.length} turns)</span>
                    </span>
                    {showDirections ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showDirections && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <TurnByTurnDirections
                        steps={selectedRoute.steps}
                        totalDistanceM={selectedRoute.distance_m}
                        totalDurationSeconds={selectedRoute.duration_seconds}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 8. Safety Signals & Limitations Expandable Accordion */}
              <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setShowSafetySignals(!showSafetySignals)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safety Pulse Signals & Coverage</span>
                  </span>
                  {showSafetySignals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSafetySignals && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Data Coverage:</span>
                      <span className="font-semibold text-slate-200">
                        {Math.round((selectedRoute.risk_assessment?.data_coverage || 0) * 100)}% ({selectedRoute.risk_assessment?.data_coverage_label || 'low'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Confidence Level:</span>
                      <span className="font-semibold text-slate-200 capitalize">
                        {selectedRoute.risk_assessment?.confidence || 'insufficient'}
                      </span>
                    </div>

                    {selectedRoute.strongest_signals && selectedRoute.strongest_signals.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 block">Corridor Signals:</span>
                        {selectedRoute.strongest_signals.map((sig, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            <span>{sig.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 italic pt-1">
                      "Route safety assessments are estimates based on available information. They do not guarantee safety or predict crime."
                    </div>
                  </div>
                )}
              </div>

              {/* 9. Reset Button */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear and Plan New Route</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;
