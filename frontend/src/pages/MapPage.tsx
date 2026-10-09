import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  MapPin,
  ArrowLeft,
  Filter,
  Navigation,
  RefreshCw,
  AlertCircle,
  Compass,
  Flame,
  Route,
} from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import mapService from '../services/mapService';
import apiService from '../services/api';
import routeService from '../services/routeService';
import SafetyPulseCard from '../components/safety-pulse/SafetyPulseCard';
import type {
  MapSafetyReport,
  MapHelpPoint,
  MapHotspot,
  Journey,
  JourneyLocationPoint,
  SearchResultLocation,
  MapFilterState,
  SafetyPulseResponse,
  RouteAlternativeItem,
  RouteCoordinates,
  RouteAlternativesResponse,
} from '../types';
import SafeSphereMap, { normalizeRouteCoordinates } from '../components/map/SafeSphereMap';
import GoogleNavMap from '../components/map/GoogleNavMap';
import MapSearch from '../components/map/MapSearch';
import MapFilters, { defaultMapFilters } from '../components/map/MapFilters';
import MapLegend from '../components/map/MapLegend';
import MapControls from '../components/map/MapControls';
import LocationPermissionModal from '../components/location/LocationPermissionModal';
import NavigationPanel from '../components/route/NavigationPanel';
import type { TransportProfile } from '../components/route/TransportModeSelector';

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentLocation,
    isLocationEnabled,
    error: locationError,
    requestLocation,
    startLocationTracking,
  } = useLocation();

  const [reports, setReports] = useState<MapSafetyReport[]>([]);
  const [helpPoints, setHelpPoints] = useState<MapHelpPoint[]>([]);
  const [hotspots, setHotspots] = useState<MapHotspot[]>([]);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [recordedJourneyPoints, setRecordedJourneyPoints] = useState<JourneyLocationPoint[]>([]);

  // Navigation and Route Planning State
  const [isNavMode, setIsNavMode] = useState<boolean>(true);
  const [isNavPanelCollapsed, setIsNavPanelCollapsed] = useState<boolean>(false);
  const [navOrigin, setNavOrigin] = useState<RouteCoordinates | null>(null);
  const [navDestination, setNavDestination] = useState<RouteCoordinates | null>(null);
  const [navProfile, setNavProfile] = useState<TransportProfile>('driving');
  const [candidateRoutes, setCandidateRoutes] = useState<RouteAlternativeItem[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isNavCalculating, setIsNavCalculating] = useState<boolean>(false);
  const [navError, setNavError] = useState<string | null>(null);
  const [navResponseMeta, setNavResponseMeta] = useState<RouteAlternativesResponse | null>(null);
  const [isStartingJourney, setIsStartingJourney] = useState<boolean>(false);

  const [is3D, setIs3D] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResultLocation | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  const [filters, setFilters] = useState<MapFilterState>(defaultMapFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Safety Pulse Location Assessment State
  const [inspectedLocation, setInspectedLocation] = useState<{ latitude: number; longitude: number; label?: string } | null>(null);
  const [isPulseOpen, setIsPulseOpen] = useState<boolean>(false);
  const [pulseSummary, setPulseSummary] = useState<SafetyPulseResponse | null>(null);

  const mapInstanceRef = useRef<L.Map | null>(null);
  const googleMapInstanceRef = useRef<google.maps.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [activeMapProvider, setActiveMapProvider] = useState<'google' | 'osm'>('google');

  // Sync default origin with current location when detected
  useEffect(() => {
    if (currentLocation && !navOrigin) {
      setNavOrigin({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        label: 'My Current Location',
      });
    }
  }, [currentLocation, navOrigin]);

  // 1. Fetch Map Data (Reports, Verified Help Points, Hotspot Overlays)
  const fetchMapData = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const data = await mapService.getConsolidatedMapData(
        currentLocation?.latitude,
        currentLocation?.longitude,
        25000
      );
      setReports(data.reports || []);
      setHelpPoints(data.help_points || []);
      setHotspots(data.hotspots || []);
    } catch (err: any) {
      console.error('Failed to load map telemetry data:', err);
      setDataError('Safety reports and help points could not be loaded. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation]);

  // 2. Fetch Active Journey from Step 4
  const fetchActiveJourney = useCallback(async () => {
    try {
      const active = await apiService.getActiveJourney();
      if (active) {
        setActiveJourney(active);
        const points = await apiService.getJourneyLocationPoints(active.id);
        setRecordedJourneyPoints(points || []);
      } else {
        setActiveJourney(null);
        setRecordedJourneyPoints([]);
      }
    } catch (err) {
      console.error('Error checking active journey:', err);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
    fetchActiveJourney();
  }, [fetchMapData, fetchActiveJourney]);

  // 3. Centralized Route Calculation Routine
  const calculateNavigationRoute = useCallback(
    async (
      originCoord: RouteCoordinates | null,
      destCoord: RouteCoordinates | null,
      profileMode: TransportProfile
    ) => {
      if (!originCoord || !destCoord) {
        setCandidateRoutes([]);
        setSelectedRouteId(null);
        setNavResponseMeta(null);
        return;
      }

      setIsNavCalculating(true);
      setNavError(null);

      try {
        const res = await routeService.getRouteAlternatives({
          origin: {
            latitude: originCoord.latitude,
            longitude: originCoord.longitude,
            label: originCoord.label,
          },
          destination: {
            latitude: destCoord.latitude,
            longitude: destCoord.longitude,
            label: destCoord.label,
          },
          profile: profileMode,
          travel_mode: profileMode,
          departure_time: new Date().toISOString(),
          alternatives: true,
        });

        setNavResponseMeta(res);
        setCandidateRoutes(res.routes || []);

        const defaultId =
          res.recommended_route_id || (res.routes[0] ? res.routes[0].route_id : null);
        setSelectedRouteId(defaultId);
      } catch (err: any) {
        console.error('Route calculation error:', err);
        const detailMsg =
          err.response?.data?.detail ||
          err.message ||
          'No route is available for this travel mode.';
        setNavError(detailMsg);
        setCandidateRoutes([]);
        setSelectedRouteId(null);
        setNavResponseMeta(null);
      } finally {
        setIsNavCalculating(false);
      }
    },
    []
  );

  // Recalculate route whenever origin, destination, or profile changes
  const handleProfileChange = (newProfile: TransportProfile) => {
    setNavProfile(newProfile);
    if (navOrigin && navDestination) {
      calculateNavigationRoute(navOrigin, navDestination, newProfile);
    }
  };

  const handleOriginChange = (coords: RouteCoordinates | null) => {
    setNavOrigin(coords);
    if (coords && navDestination) {
      calculateNavigationRoute(coords, navDestination, navProfile);
    }
  };

  const handleDestinationChange = (coords: RouteCoordinates | null) => {
    setNavDestination(coords);
    if (navOrigin && coords) {
      calculateNavigationRoute(navOrigin, coords, navProfile);
    }
  };

  const handleResetNavigation = () => {
    setNavDestination(null);
    setCandidateRoutes([]);
    setSelectedRouteId(null);
    setNavResponseMeta(null);
    setNavError(null);
  };

  // Recenter GPS
  const handleRecenter = () => {
    if (currentLocation) {
      if (activeMapProvider === 'google' && googleMapInstanceRef.current) {
        googleMapInstanceRef.current.panTo({
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        });
        googleMapInstanceRef.current.setZoom(16);
      } else if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(
          [currentLocation.latitude, currentLocation.longitude],
          15,
          { animate: true, duration: 1.2 }
        );
      }
    } else {
      requestLocation();
      setPermissionModalOpen(true);
    }
  };

  const handleZoomIn = () => {
    if (activeMapProvider === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom((googleMapInstanceRef.current.getZoom() || 14) + 1);
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (activeMapProvider === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom((googleMapInstanceRef.current.getZoom() || 14) - 1);
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleToggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fit viewport to specific route
  const handleViewRoute = (routeId: string) => {
    const route = candidateRoutes.find((r) => r.route_id === routeId);
    if (route && mapInstanceRef.current) {
      const latLngs = normalizeRouteCoordinates(route.geometry.coordinates);
      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        bounds.extend([route.origin.latitude, route.origin.longitude]);
        bounds.extend([route.destination.latitude, route.destination.longitude]);
        const isDesktop = window.innerWidth >= 1024;
        mapInstanceRef.current.fitBounds(bounds, {
          paddingTopLeft: isDesktop && isNavMode ? [440, 60] : [60, 60],
          paddingBottomRight: isDesktop ? [60, 60] : [60, 240],
          maxZoom: 17,
        });
      }
    }
  };

  // Start Journey with selected route (Step 4 & 10 integration)
  const handleStartJourneyFromRoute = async (routeToStart: RouteAlternativeItem) => {
    setIsStartingJourney(true);
    try {
      const destLabel = routeToStart.destination.label || 'Destination';
      const newJourney = await apiService.createJourney({
        destination_name: destLabel,
        title: `${routeToStart.route_type.replace(/_/g, ' ').toUpperCase()} Commute`,
        start_latitude: routeToStart.origin.latitude,
        start_longitude: routeToStart.origin.longitude,
        destination_latitude: routeToStart.destination.latitude,
        destination_longitude: routeToStart.destination.longitude,
        selected_route_id: routeToStart.route_id,
        route_provider: routeToStart.provider,
        route_geometry: JSON.stringify(routeToStart.geometry.coordinates),
        planned_distance_m: routeToStart.distance_m,
        planned_duration_seconds: routeToStart.duration_seconds,
        estimated_risk_level: routeToStart.risk_assessment?.risk_level || 'unknown',
        route_data_coverage: routeToStart.risk_assessment?.data_coverage || 0.0,
        route_assessed_at: new Date().toISOString(),
      });

      startLocationTracking(newJourney.id);
      setActiveJourney(newJourney);
      navigate('/journey');
    } catch (err: any) {
      console.error('Failed to start journey from route:', err);
      setDataError(
        err.response?.data?.detail || err.message || 'Failed to start journey. Please try again.'
      );
    } finally {
      setIsStartingJourney(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {activeJourney && (
            <button
              type="button"
              onClick={() => navigate('/journey')}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-600/30 transition"
            >
              <Navigation className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Active Trip: {activeJourney.destination_name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchMapData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh map telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Header and Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-blue-400" />
            SafeSphere Navigation & Interactive Map
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real street navigation with Safety Pulse intelligence, community reports, and 24/7 safe havens.
          </p>
        </div>

        {/* Navigation Mode Toggle, Safety Pulse & Filter Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsNavMode((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95 ${
              isNavMode
                ? 'bg-blue-600 border-blue-500 text-white shadow-blue-600/30'
                : 'bg-slate-900 border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
            title="Toggle Navigation / Route Planner Panel"
          >
            <Route className="w-3.5 h-3.5 text-blue-300" />
            <span>{isNavMode ? 'Hide Navigation' : 'Plan Navigation'}</span>
            {candidateRoutes.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsPulseOpen(!isPulseOpen)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
              isPulseOpen
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-slate-900 border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-indigo-400" />
            <span>Safety Pulse</span>
            {pulseSummary?.score !== null && pulseSummary?.score !== undefined ? (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950/60 text-[10px] font-bold">
                {pulseSummary.score}/100
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Layers</span>
            <span className="w-2 h-2 rounded-full bg-blue-400" />
          </button>

          {!isLocationEnabled && (
            <button
              type="button"
              onClick={() => setPermissionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Enable GPS</span>
            </button>
          )}
        </div>
      </div>

      {/* Error & Warning Banners */}
      {dataError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{dataError}</span>
          </div>
          <button
            type="button"
            onClick={fetchMapData}
            className="text-xs font-semibold underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {locationError && !isLocationEnabled && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Location unavailable. Enable location access to see your position on the map.</span>
        </div>
      )}

      {/* Main Layout: Google Maps-Inspired Navigation Side Panel + Map */}
      <div
        ref={mapWrapperRef}
        className={`relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl w-full flex flex-col lg:flex-row ${
          isFullscreen
            ? 'h-screen w-screen rounded-none border-0'
            : 'h-[720px] min-h-[550px] lg:min-h-[720px]'
        }`}
      >
        {/* Navigation Side Panel (Desktop side panel / Mobile docked panel) */}
        {isNavMode && (
          <div className="w-full lg:w-[420px] z-[1100] lg:relative shrink-0 shadow-2xl border-b lg:border-b-0 lg:border-r border-slate-800/80 max-h-[50%] lg:max-h-full overflow-hidden flex flex-col">
            <NavigationPanel
              origin={navOrigin}
              destination={navDestination}
              profile={navProfile}
              candidateRoutes={candidateRoutes}
              selectedRouteId={selectedRouteId}
              isLoading={isNavCalculating}
              error={navError}
              responseMeta={navResponseMeta}
              onOriginChange={handleOriginChange}
              onDestinationChange={handleDestinationChange}
              onProfileChange={handleProfileChange}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              onViewRoute={handleViewRoute}
              onStartJourney={handleStartJourneyFromRoute}
              onReset={handleResetNavigation}
              isStartingJourney={isStartingJourney}
              isCollapsed={isNavPanelCollapsed}
              onToggleCollapse={() => setIsNavPanelCollapsed(!isNavPanelCollapsed)}
              className="h-full rounded-none border-0 shadow-none bg-slate-900/98"
            />
          </div>
        )}

        {/* Map Canvas Area */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          {/* Top Search Bar (when Navigation panel is closed) */}
          {!isNavMode && (
            <div className="absolute top-4 left-4 z-[1000] w-[calc(100%-110px)] max-w-sm">
              <MapSearch
                onLocationSelect={(loc: SearchResultLocation) => setSearchResult(loc)}
                onClearSearch={() => setSearchResult(null)}
              />
            </div>
          )}

          {/* Top-Right Map Controls Overlay (Provider switcher, 2D/3D toggle, Zoom, Recenter, Fullscreen) */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
            {/* Map Engine Provider Switcher Pill */}
            <button
              type="button"
              onClick={() => setActiveMapProvider(activeMapProvider === 'google' ? 'osm' : 'google')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-[11px] font-semibold text-slate-200 hover:text-white shadow-xl transition flex items-center gap-1.5 active:scale-95"
              title="Switch between Google Maps Vector Engine and Clean OpenStreetMap"
              aria-label="Switch map engine"
            >
              <span className={`w-2 h-2 rounded-full ${activeMapProvider === 'google' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
              <span>{activeMapProvider === 'google' ? 'Google Maps (Vector)' : 'OpenStreetMap (Clean)'}</span>
            </button>

            <MapControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onRecenter={handleRecenter}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              hasLocation={Boolean(currentLocation)}
              is3D={is3D}
              onToggle3D={() => setIs3D(!is3D)}
            />
          </div>

          {/* Bottom-Left Collapsible Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] max-w-xs">
            <MapLegend />
          </div>

          {/* Bottom-Right Active Statistics Overlay */}
          <div className="absolute bottom-4 right-4 z-[1000] hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 text-[11px] text-slate-300 shadow-xl">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Reports: {reports.length}</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Help Points: {helpPoints.length}</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Hotspots: {hotspots.length}</span>
            </span>
          </div>

          {/* Map Layer: Google Maps JavaScript API (Vector & 3D Tilt) or Clean OpenStreetMap Fallback */}
          {activeMapProvider === 'google' ? (
            <GoogleNavMap
              userLocation={currentLocation}
              reports={reports}
              helpPoints={helpPoints}
              hotspots={hotspots}
              activeJourney={activeJourney}
              recordedJourneyPoints={recordedJourneyPoints}
              searchResult={searchResult}
              filters={filters}
              candidateRoutes={candidateRoutes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(routeId: string) => setSelectedRouteId(routeId)}
              is3D={is3D}
              hasSidePanel={isNavMode && !isNavPanelCollapsed}
              onMarkerClick={(marker: any) => setSelectedMarker(marker)}
              onMapClick={(lat: number, lng: number) => {
                if (isNavMode && !navDestination) {
                  setNavDestination({
                    latitude: lat,
                    longitude: lng,
                    label: `Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                  });
                  if (navOrigin) {
                    calculateNavigationRoute(
                      navOrigin,
                      { latitude: lat, longitude: lng, label: 'Selected Map Destination' },
                      navProfile
                    );
                  }
                } else {
                  setInspectedLocation({ latitude: lat, longitude: lng, label: 'Selected Map Coordinate' });
                  setIsPulseOpen(true);
                }
              }}
              className="h-full w-full"
              onMapReady={(map: google.maps.Map) => {
                googleMapInstanceRef.current = map;
              }}
              onSwitchToOsm={() => setActiveMapProvider('osm')}
            />
          ) : (
            <SafeSphereMap
              userLocation={currentLocation}
              reports={reports}
              helpPoints={helpPoints}
              hotspots={hotspots}
              activeJourney={activeJourney}
              recordedJourneyPoints={recordedJourneyPoints}
              searchResult={searchResult}
              filters={filters}
              candidateRoutes={candidateRoutes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(routeId: string) => setSelectedRouteId(routeId)}
              is3D={is3D}
              hasSidePanel={isNavMode && !isNavPanelCollapsed}
              onMarkerClick={(marker: any) => setSelectedMarker(marker)}
              onMapClick={(lat: number, lng: number) => {
                if (isNavMode && !navDestination) {
                  setNavDestination({
                    latitude: lat,
                    longitude: lng,
                    label: `Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                  });
                  if (navOrigin) {
                    calculateNavigationRoute(
                      navOrigin,
                      { latitude: lat, longitude: lng, label: 'Selected Map Destination' },
                      navProfile
                    );
                  }
                } else {
                  setInspectedLocation({ latitude: lat, longitude: lng, label: 'Selected Map Coordinate' });
                  setIsPulseOpen(true);
                }
              }}
              pulseAssessment={
                inspectedLocation
                  ? { latitude: inspectedLocation.latitude, longitude: inspectedLocation.longitude, radius: 500 }
                  : currentLocation
                  ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude, radius: 500 }
                  : null
              }
              className="h-full w-full"
              onMapReady={(map: L.Map) => {
                mapInstanceRef.current = map;
              }}
            />
          )}
        </div>
      </div>

      {/* Safety Pulse Sector Assessment Bottom Drawer */}
      {isPulseOpen && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-indigo-400" />
              Safety Pulse Sector Assessment: {inspectedLocation ? (inspectedLocation.label || 'Selected Coordinate') : 'Current GPS Location'}
            </span>
            {inspectedLocation && (
              <button
                type="button"
                onClick={() => setInspectedLocation(null)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline transition"
              >
                Reset to Current GPS
              </button>
            )}
          </div>
          <SafetyPulseCard
            externalLat={inspectedLocation ? inspectedLocation.latitude : (currentLocation?.latitude ?? null)}
            externalLon={inspectedLocation ? inspectedLocation.longitude : (currentLocation?.longitude ?? null)}
            onScoreLoaded={(data) => setPulseSummary(data)}
          />
        </div>
      )}

      {/* Selected Marker Detail Card */}
      {selectedMarker && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between text-xs animate-fade-in shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold uppercase text-[10px]">
                {selectedMarker.category || selectedMarker.type || 'Marker'}
              </span>
              {selectedMarker.severity && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] uppercase font-semibold">
                  Severity: {selectedMarker.severity}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white">{selectedMarker.title || selectedMarker.name}</h4>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              {selectedMarker.description || selectedMarker.address}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMarker(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Modal Drawer */}
      <MapFilters
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApplyFilters={(newFilters: MapFilterState) => setFilters(newFilters)}
      />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onGranted={() => {
          handleRecenter();
        }}
      />
    </div>
  );
};

export default MapPage;
