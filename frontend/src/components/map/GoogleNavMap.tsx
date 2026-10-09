import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  AlertTriangle,
  ExternalLink,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import type {
  LocationCoordinates,
  MapSafetyReport,
  MapHelpPoint,
  MapHotspot,
  Journey,
  JourneyLocationPoint,
  SearchResultLocation,
  MapFilterState,
  RouteAlternativeItem,
} from '../../types';
import { normalizeRouteCoordinates } from './SafeSphereMap';

export interface GoogleNavMapProps {
  userLocation?: LocationCoordinates | null;
  reports?: MapSafetyReport[];
  helpPoints?: MapHelpPoint[];
  hotspots?: MapHotspot[];
  activeJourney?: Journey | null;
  recordedJourneyPoints?: JourneyLocationPoint[];
  searchResult?: SearchResultLocation | null;
  selectedMarker?: any;
  center?: [number, number];
  zoom?: number;
  showUserLocation?: boolean;
  showReports?: boolean;
  showHelpPoints?: boolean;
  showHotspots?: boolean;
  filters?: MapFilterState;
  onMarkerClick?: (marker: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
  customMarker?: { latitude: number; longitude: number; label?: string; icon?: string } | null;
  pulseAssessment?: { latitude: number; longitude: number; radius: number } | null;
  candidateRoutes?: RouteAlternativeItem[];
  selectedRouteId?: string | null;
  onSelectRoute?: (routeId: string) => void;
  is3D?: boolean;
  hasSidePanel?: boolean;
  className?: string;
  onMapReady?: (map: google.maps.Map) => void;
  onSwitchToOsm?: () => void;
  isFollowMode?: boolean;
}

export const GoogleNavMap: React.FC<GoogleNavMapProps> = ({
  userLocation,
  reports = [],
  helpPoints = [],
  hotspots = [],
  activeJourney = null,
  recordedJourneyPoints = [],
  searchResult = null,
  center = [12.9716, 77.5946],
  zoom = 14,
  showUserLocation = true,
  showReports = true,
  showHelpPoints = true,
  showHotspots = true,
  filters,
  onMarkerClick,
  onMapClick,
  customMarker,
  candidateRoutes = [],
  selectedRouteId,
  onSelectRoute,
  is3D = false,
  hasSidePanel = false,
  className = '',
  onMapReady,
  onSwitchToOsm,
  isFollowMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isKeyMissing, setIsKeyMissing] = useState(false);

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_MAPS_API_KEY || '').trim();
  const mapId = (import.meta.env.VITE_GOOGLE_MAP_ID || 'safesphere-vector-map').trim();

  // 1. Initialize Google Maps JS API Vector Map
  useEffect(() => {
    if (!apiKey) {
      setIsKeyMissing(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function initGoogleMap() {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
          libraries: ['places', 'geometry'],
        });

        const mapsLib = (await importLibrary('maps')) as google.maps.MapsLibrary;
        if (!isMounted || !containerRef.current) return;

        const initialCenter = userLocation
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : { lat: center[0], lng: center[1] };

        // Create vector-enabled map instance with tilt and heading support
        const map = new mapsLib.Map(containerRef.current, {
          center: initialCenter,
          zoom,
          mapId: mapId || undefined,
          tilt: is3D ? 45 : 0,
          heading: is3D ? 30 : 0,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          rotateControl: true,
          scaleControl: true,
          gestureHandling: 'greedy',
        });

        // Click handler on map canvas
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng && onMapClick) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
          }
        });

        mapRef.current = map;
        infoWindowRef.current = new mapsLib.InfoWindow();

        if (onMapReady) {
          onMapReady(map);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Google Maps Loader Error:', err);
        if (isMounted) {
          setLoadError(err.message || 'Failed to initialize Google Maps JavaScript API.');
          setIsLoading(false);
        }
      }
    }

    initGoogleMap();

    return () => {
      isMounted = false;
    };
  }, [apiKey, mapId]);

  // 2. Handle 2D / 3D Perspective Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (is3D) {
      map.setTilt(45);
      map.setHeading(30);
    } else {
      map.setTilt(0);
      map.setHeading(0);
    }
  }, [is3D]);

  // 3. Clear existing overlays
  const clearOverlays = useCallback(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  // 4. Render Routes (Primary Recommended Route in #16A34A with White Halo + Alternatives)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    // Remove previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!candidateRoutes || candidateRoutes.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const sorted = [...candidateRoutes].sort((a, b) => {
      if (a.route_id === selectedRouteId) return 1;
      if (b.route_id === selectedRouteId) return -1;
      return 0;
    });

    let selectedPathCoords: google.maps.LatLngLiteral[] = [];

    for (const route of sorted) {
      const isSelected = route.route_id === selectedRouteId || sorted.length === 1;
      const rawCoords = route.geometry?.coordinates || [];
      const normalized = normalizeRouteCoordinates(rawCoords);
      if (normalized.length === 0) continue;

      const path = normalized.map(([lat, lng]) => ({ lat, lng }));

      const sa = route.safety_assessment || route.risk_assessment;
      let routeColor = '#64748B';
      if (sa?.color_hex && sa.color_hex.startsWith('#')) {
        routeColor = sa.color_hex;
      } else if (sa?.color === 'green') {
        routeColor = '#16A34A';
      } else if (sa?.color === 'yellow') {
        routeColor = '#EAB308';
      } else if (sa?.color === 'red') {
        routeColor = '#DC2626';
      } else if (sa?.score !== null && sa?.score !== undefined) {
        routeColor = sa.score >= 80 ? '#16A34A' : sa.score >= 50 ? '#EAB308' : '#DC2626';
      }

      if (isSelected) {
        selectedPathCoords = path;
        path.forEach((pt) => bounds.extend(pt));

        // Underlay: Crisp White Halo for maximum contrast against road networks
        const haloPolyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#FFFFFF',
          strokeOpacity: 1.0,
          strokeWeight: 14,
          zIndex: 50,
          map,
        });
        polylinesRef.current.push(haloPolyline);

        // Overlay: Primary Route in evaluated route safety color
        const mainPolyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: routeColor,
          strokeOpacity: 1.0,
          strokeWeight: 8,
          zIndex: 60,
          map,
        });
        polylinesRef.current.push(mainPolyline);
      } else {
        // Alternative Route: Lighter halo and route safety color, thinner line, clickable
        const altHalo = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.6,
          strokeWeight: 8,
          zIndex: 35,
          map,
        });
        polylinesRef.current.push(altHalo);

        const altPolyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: routeColor,
          strokeOpacity: 0.75,
          strokeWeight: 5,
          zIndex: 40,
          map,
        });

        const selectHandler = () => {
          if (onSelectRoute) {
            onSelectRoute(route.route_id);
          }
        };
        altHalo.addListener('click', selectHandler);
        altPolyline.addListener('click', selectHandler);
        polylinesRef.current.push(altPolyline);
      }
    }

    // Auto-fit bounds to selected route with proper screen padding
    if (selectedPathCoords.length > 0 && !bounds.isEmpty()) {
      const padding = {
        top: 70,
        bottom: 70,
        left: hasSidePanel ? 440 : 60,
        right: 60,
      };

      map.fitBounds(bounds, padding);

      // Re-apply 3D camera settings if fitBounds resets tilt or heading
      if (is3D) {
        google.maps.event.addListenerOnce(map, 'idle', () => {
          map.setTilt(45);
          map.setHeading(30);
        });
      }
    }
  }, [candidateRoutes, selectedRouteId, is3D, hasSidePanel, onSelectRoute, isLoading]);

  // 5. Render Markers (User, Origin, Destination, Reports, Help Points, Hotspots, Journey points)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // User Location Marker
    if (showUserLocation && userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: 'Your Current Location',
        zIndex: 100,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });
      markersRef.current.push(userMarker);
    }

    // Route Start & Destination Markers
    const activeRoute =
      candidateRoutes.find((r) => r.route_id === selectedRouteId) || candidateRoutes[0];
    if (activeRoute) {
      if (activeRoute.origin) {
        const originMarker = new google.maps.Marker({
          position: { lat: activeRoute.origin.latitude, lng: activeRoute.origin.longitude },
          map,
          title: `Start: ${activeRoute.origin.label || 'Origin'}`,
          zIndex: 95,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#10B981',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(originMarker);
      }

      if (activeRoute.destination) {
        const destMarker = new google.maps.Marker({
          position: {
            lat: activeRoute.destination.latitude,
            lng: activeRoute.destination.longitude,
          },
          map,
          title: `Destination: ${activeRoute.destination.label || 'Destination'}`,
          zIndex: 96,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#EF4444',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(destMarker);
      }
    }

    // Active Journey destination marker if applicable
    if (activeJourney && activeJourney.destination_latitude && activeJourney.destination_longitude) {
      const jDestMarker = new google.maps.Marker({
        position: {
          lat: activeJourney.destination_latitude,
          lng: activeJourney.destination_longitude,
        },
        map,
        title: `Journey Target: ${activeJourney.destination_name}`,
        zIndex: 97,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#8B5CF6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(jDestMarker);
    }

    // Recorded breadcrumb history markers if tracking
    if (recordedJourneyPoints && recordedJourneyPoints.length > 0) {
      const pathPts = recordedJourneyPoints.map((pt) => ({ lat: pt.latitude, lng: pt.longitude }));
      const breadcrumbLine = new google.maps.Polyline({
        path: pathPts,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.7,
        strokeWeight: 4,
        zIndex: 45,
        map,
      });
      polylinesRef.current.push(breadcrumbLine);
    }

    // Search Result Marker
    if (searchResult) {
      const sMarker = new google.maps.Marker({
        position: { lat: searchResult.latitude, lng: searchResult.longitude },
        map,
        title: searchResult.displayName || searchResult.name,
        zIndex: 98,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#6366F1',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(sMarker);
    }

    // Safety Reports Markers
    if (showReports && reports.length > 0) {
      reports.forEach((rep) => {
        if (filters && filters.categories && filters.categories.length > 0 && !filters.categories.includes(rep.category)) return;
        const color =
          rep.severity === 'critical'
            ? '#EF4444'
            : rep.severity === 'high'
            ? '#F97316'
            : rep.severity === 'medium'
            ? '#EAB308'
            : '#3B82F6';

        const repMarker = new google.maps.Marker({
          position: { lat: rep.latitude, lng: rep.longitude },
          map,
          title: `Safety Report: ${rep.title}`,
          zIndex: 75,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 1.5,
          },
        });

        repMarker.addListener('click', () => {
          if (onMarkerClick) onMarkerClick(rep);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family: sans-serif; padding: 4px; max-width: 220px; color: #0f172a;">
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${rep.title}</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${rep.category} &bull; ${rep.severity}</div>
                <div style="font-size: 12px; color: #334155;">${rep.description || ''}</div>
              </div>
            `);
            infoWindowRef.current.open(map, repMarker);
          }
        });
        markersRef.current.push(repMarker);
      });
    }

    // Verified Help Points Markers
    if (showHelpPoints && helpPoints.length > 0) {
      helpPoints.forEach((hp) => {
        if (filters && filters.helpPointTypes && filters.helpPointTypes.length > 0 && !filters.helpPointTypes.includes(hp.type)) return;
        const hpMarker = new google.maps.Marker({
          position: { lat: hp.latitude, lng: hp.longitude },
          map,
          title: `Help Point: ${hp.name}`,
          zIndex: 80,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#0EA5E9',
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        hpMarker.addListener('click', () => {
          if (onMarkerClick) onMarkerClick(hp);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family: sans-serif; padding: 4px; max-width: 220px; color: #0f172a;">
                <div style="font-weight: 700; font-size: 13px; color: #0284c7;">${hp.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Verified Haven (${hp.type})</div>
                <div style="font-size: 12px; color: #334155;">${hp.address || ''}</div>
              </div>
            `);
            infoWindowRef.current.open(map, hpMarker);
          }
        });
        markersRef.current.push(hpMarker);
      });
    }

    // Hotspots Markers
    if (showHotspots && hotspots.length > 0) {
      hotspots.forEach((hs) => {
        const hsMarker = new google.maps.Marker({
          position: { lat: hs.latitude, lng: hs.longitude },
          map,
          title: `Community Signal Cluster: ${hs.label}`,
          zIndex: 70,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#F43F5E',
            fillOpacity: 0.4,
            strokeColor: '#E11D48',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(hsMarker);
      });
    }

    // Custom Selected Coordinate Marker
    if (customMarker) {
      const cMarker = new google.maps.Marker({
        position: { lat: customMarker.latitude, lng: customMarker.longitude },
        map,
        title: customMarker.label || 'Selected Location',
        zIndex: 90,
      });
      markersRef.current.push(cMarker);
    }
  }, [
    userLocation,
    showUserLocation,
    candidateRoutes,
    selectedRouteId,
    activeJourney,
    recordedJourneyPoints,
    searchResult,
    reports,
    showReports,
    helpPoints,
    showHelpPoints,
    hotspots,
    showHotspots,
    customMarker,
    filters,
    isLoading,
    onMarkerClick,
  ]);

  // 6. Follow-me Navigation Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isFollowMode || !userLocation) return;

    map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
    if (userLocation.heading !== undefined && userLocation.heading !== null && userLocation.speed && userLocation.speed > 0.5) {
      map.setHeading(userLocation.heading);
    }
  }, [isFollowMode, userLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearOverlays();
    };
  }, [clearOverlays]);

  // Setup / Missing Key Screen
  if (isKeyMissing) {
    return (
      <div className={`relative flex items-center justify-center p-6 bg-slate-950 text-slate-100 ${className}`}>
        <div className="max-w-lg w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Maps Setup Required</h2>
              <p className="text-xs text-slate-400">Vector map rendering & Google Routes Platform integration</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-6">
            <p>
              To render Google Maps JavaScript API with vector road network, 3D building visualization, and Routes API:
            </p>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 font-mono text-[11px] space-y-1.5 text-slate-300">
              <div className="text-emerald-400 font-semibold mb-1"># Frontend (.env):</div>
              <div>VITE_GOOGLE_MAPS_MAPS_API_KEY=your_key</div>
              <div>VITE_GOOGLE_MAP_ID=your_map_id</div>
              <div className="text-emerald-400 font-semibold mt-2 mb-1"># Backend (.env):</div>
              <div>GOOGLE_MAPS_ROUTES_API_KEY=your_key</div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 space-y-1">
              <div className="font-semibold text-white">Google Cloud Console APIs to enable:</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>Maps JavaScript API (Vector Map with tilt/rotation enabled)</li>
                <li>Routes API (Directions v2 computeRoutes)</li>
                <li>Places API (Destination search & autocomplete)</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {onSwitchToOsm && (
              <button
                type="button"
                onClick={onSwitchToOsm}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Switch to Clean OpenStreetMap (No Watermark)</span>
              </button>
            )}

            <a
              href="https://console.cloud.google.com/google/maps-apis/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>Get API Key</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // API Load Error Screen
  if (loadError) {
    return (
      <div className={`relative flex items-center justify-center p-6 bg-slate-950 text-slate-100 ${className}`}>
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 text-rose-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-bold text-sm">Google Maps Initialization Error</h3>
          </div>
          <p className="text-xs text-slate-300 mb-4">{loadError}</p>
          {onSwitchToOsm && (
            <button
              type="button"
              onClick={onSwitchToOsm}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
            >
              Switch to Clean OpenStreetMap
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3" />
          <span className="text-xs font-semibold text-slate-300">Loading Google Vector Map...</span>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default GoogleNavMap;
