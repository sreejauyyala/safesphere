import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import OriginDestinationForm from './OriginDestinationForm';
import RouteComparisonCard from './RouteComparisonCard';
import RouteSelectionControls from './RouteSelectionControls';
import type { TransportProfile } from './TransportModeSelector';
import routeService from '../../services/routeService';
import type {
  RouteCoordinates,
  RouteAlternativeItem,
  RouteAlternativesResponse,
  RouteSortPriority,
} from '../../types';

interface RoutePlannerProps {
  onRoutesCalculated?: (routes: RouteAlternativeItem[], selectedId: string | null) => void;
  onSelectedRouteChange?: (route: RouteAlternativeItem | null) => void;
  onStartJourneyWithRoute?: (route: RouteAlternativeItem) => void;
  isStartingJourney?: boolean;
  className?: string;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  onRoutesCalculated,
  onSelectedRouteChange,
  onStartJourneyWithRoute,
  isStartingJourney = false,
  className = '',
}) => {
  const [origin, setOrigin] = useState<RouteCoordinates | null>(null);
  const [destination, setDestination] = useState<RouteCoordinates | null>(null);
  const [profile, setProfile] = useState<TransportProfile>('walking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [response, setResponse] = useState<RouteAlternativesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [sortPriority, setSortPriority] = useState<RouteSortPriority>('safety');

  // Submit and calculate candidate routes
  const handleCalculateRoutes = async () => {
    if (!origin || !destination) {
      setError('Please provide both starting point and destination.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await routeService.getRouteAlternatives({
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
          label: origin.label,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
          label: destination.label,
        },
        profile,
        travel_mode: profile,
        departure_time: new Date().toISOString(),
        alternatives: true,
      });

      setResponse(res);

      // Default selected route: recommended route, or first route
      const defaultId = res.recommended_route_id || (res.routes[0] ? res.routes[0].route_id : null);
      setSelectedRouteId(defaultId);

      const defaultRoute = res.routes.find((r) => r.route_id === defaultId) || res.routes[0] || null;

      if (onRoutesCalculated) {
        onRoutesCalculated(res.routes, defaultId);
      }
      if (onSelectedRouteChange) {
        onSelectedRouteChange(defaultRoute);
      }
    } catch (err: any) {
      console.error('Route calculation error:', err);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Could not calculate routes. Please check your network connection and retry.';
      setError(msg);
      setResponse(null);
      if (onRoutesCalculated) {
        onRoutesCalculated([], null);
      }
      if (onSelectedRouteChange) {
        onSelectedRouteChange(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (newProfile: TransportProfile) => {
    setProfile(newProfile);
    if (origin && destination) {
      // Immediate recalculation for the new transport mode
      setTimeout(() => {
        handleCalculateRoutes();
      }, 50);
    }
  };

  // Sort candidate routes according to user selected priority
  const sortedRoutes = useMemo(() => {
    if (!response || !response.routes) return [];
    const list = [...response.routes];

    if (sortPriority === 'time') {
      return list.sort((a, b) => a.duration_seconds - b.duration_seconds);
    }

    if (sortPriority === 'distance') {
      return list.sort((a, b) => a.distance_m - b.distance_m);
    }

    // Default: Safety-Aware ranking
    return list.sort((a, b) => {
      // Prioritize lower estimated risk, then data coverage
      const rankScore = (r: RouteAlternativeItem) => {
        if (r.route_type === 'lower_estimated_risk') return 1000;
        const score = r.risk_assessment.score ?? 50;
        const coverageBonus = r.risk_assessment.data_coverage * 10;
        return score + coverageBonus;
      };
      return rankScore(b) - rankScore(a);
    });
  }, [response, sortPriority]);

  const selectedRoute = useMemo(() => {
    if (!response || !selectedRouteId) return null;
    return response.routes.find((r) => r.route_id === selectedRouteId) || null;
  }, [response, selectedRouteId]);

  const handleSelectRoute = (id: string) => {
    setSelectedRouteId(id);
    const found = response?.routes.find((r) => r.route_id === id) || null;
    if (onSelectedRouteChange) {
      onSelectedRouteChange(found);
    }
  };

  const handleHighlightRoute = (id: string) => {
    setSelectedRouteId(id);
    const found = response?.routes.find((r) => r.route_id === id) || null;
    if (onSelectedRouteChange) {
      onSelectedRouteChange(found);
    }
  };

  const handleStartJourney = () => {
    if (selectedRoute && onStartJourneyWithRoute) {
      onStartJourneyWithRoute(selectedRoute);
    }
  };

  const handleReset = () => {
    setResponse(null);
    setSelectedRouteId(null);
    setError(null);
    if (onRoutesCalculated) onRoutesCalculated([], null);
    if (onSelectedRouteChange) onSelectedRouteChange(null);
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Origin & Destination Input Form */}
      <OriginDestinationForm
        origin={origin}
        destination={destination}
        profile={profile}
        onOriginChange={setOrigin}
        onDestinationChange={setDestination}
        onProfileChange={handleProfileChange}
        onSubmit={handleCalculateRoutes}
        isLoading={loading}
        error={error}
      />

      {/* 2. Candidate Route Comparison & Selection Section */}
      {response && response.routes.length > 0 && (
        <div className="space-y-4">
          {/* Recommendation Banner if available */}
          {response.recommendation_status === 'recommended' && response.recommendation_reason && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-200">Safety Recommendation: </span>
                {response.recommendation_reason}
              </div>
            </div>
          )}

          {response.recommendation_status === 'insufficient_data' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-200">Limited Comparative Data: </span>
                Insufficient civic reports along some corridors. We avoid making automatic safety claims without supporting data.
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <RouteSelectionControls
            priority={sortPriority}
            onPriorityChange={setSortPriority}
            selectedRoute={selectedRoute}
            routesCount={response.routes.length}
            onStartJourney={handleStartJourney}
            isStarting={isStartingJourney}
          />

          {/* Route Comparison Cards */}
          <div className="space-y-3">
            {sortedRoutes.map((route) => (
              <RouteComparisonCard
                key={route.route_id}
                route={route}
                isSelected={selectedRouteId === route.route_id}
                isRecommended={response.recommended_route_id === route.route_id}
                onSelect={handleSelectRoute}
                onHighlight={handleHighlightRoute}
              />
            ))}
          </div>

          {/* Recalculate / New Search Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear and Plan New Route</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;
