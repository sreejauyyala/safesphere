import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
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
import {
  createUserLocationIcon,
  createSafetyReportIcon,
  createHelpPointIcon,
  createSearchMarkerIcon,
  createJourneyEndpointIcon,
} from './markerIcons';
import {
  renderReportPopupHtml,
  renderHelpPointPopupHtml,
  renderHotspotPopupHtml,
} from './popupTemplates';
import { MapResizeHandler } from './MapResizeHandler';

export interface SafeSphereMapProps {
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
  onMapReady?: (map: L.Map) => void;
}

/**
 * Normalizes GeoJSON coordinate lists [[lon, lat], ...] to Leaflet latLng arrays [[lat, lon], ...].
 * Safely handles inverted coordinates and nested GeoJSON LineString objects.
 */
export const normalizeRouteCoordinates = (rawCoords: any): [number, number][] => {
  if (!rawCoords) return [];
  let list: any[] = [];

  if (Array.isArray(rawCoords)) {
    list = rawCoords;
  } else if (rawCoords && rawCoords.type === 'LineString' && Array.isArray(rawCoords.coordinates)) {
    list = rawCoords.coordinates;
  } else if (typeof rawCoords === 'string') {
    try {
      const parsed = JSON.parse(rawCoords);
      if (Array.isArray(parsed)) list = parsed;
      else if (parsed && parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) {
        list = parsed.coordinates;
      }
    } catch {
      return [];
    }
  }

  const results: [number, number][] = [];
  for (const pt of list) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const a = Number(pt[0]);
    const b = Number(pt[1]);
    if (isNaN(a) || isNaN(b)) continue;

    // Check longitude vs latitude orientation
    // Latitudes: -90 to +90. Longitudes: -180 to +180.
    // If 'a' is longitude and 'b' is latitude:
    if (Math.abs(a) > 40 && Math.abs(b) <= 40) {
      results.push([b, a]);
    } else if (Math.abs(b) > 40 && Math.abs(a) <= 40) {
      results.push([a, b]);
    } else {
      // Default GeoJSON convention: [lon, lat] -> Leaflet [lat, lon]
      results.push([b, a]);
    }
  }

  return results;
};

export const SafeSphereMap: React.FC<SafeSphereMapProps> = ({
  userLocation = null,
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
  customMarker = null,
  pulseAssessment = null,
  candidateRoutes = [],
  selectedRouteId = null,
  onSelectRoute,
  is3D = false,
  hasSidePanel = false,
  className = 'w-full h-full min-h-[450px] sm:min-h-[500px] lg:min-h-[600px]',
  onMapReady,
}) => {
  const reactId = React.useId().replace(/:/g, '');
  const canvasId = `safesphere-map-${reactId}`;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [tileError, setTileError] = useState<boolean>(false);

  // Keep latest callbacks in refs to avoid stale closures in Leaflet events
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  // Dedicated Layer Groups
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const reportsLayerRef = useRef<L.LayerGroup | null>(null);
  const helpPointsLayerRef = useRef<L.LayerGroup | null>(null);
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);
  const journeyLayerRef = useRef<L.LayerGroup | null>(null);
  const searchLayerRef = useRef<L.LayerGroup | null>(null);
  const customMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const pulseLayerRef = useRef<L.LayerGroup | null>(null);

  const initialCenteredRef = useRef<boolean>(false);
  const lastFittedRouteKeyRef = useRef<string | null>(null);

  // Tile retry handler
  const retryTiles = () => {
    if (tileLayerRef.current) {
      setTileError(false);
      tileLayerRef.current.redraw();
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = customMarker ? customMarker.latitude : userLocation?.latitude ?? center[0];
      const initialLng = customMarker ? customMarker.longitude : userLocation?.longitude ?? center[1];

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([initialLat, initialLng], zoom);

      // Create dedicated visual hierarchy panes
      if (!map.getPane('routeHaloPane')) {
        const haloPane = map.createPane('routeHaloPane');
        haloPane.style.zIndex = '440';
      }
      if (!map.getPane('routeLinesPane')) {
        const linesPane = map.createPane('routeLinesPane');
        linesPane.style.zIndex = '450';
      }
      if (!map.getPane('routeMarkersPane')) {
        const markersPane = map.createPane('routeMarkersPane');
        markersPane.style.zIndex = '620';
      }

      // Clean high-clarity OpenStreetMap navigation basemap with distributed subdomains
      const tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }
      );

      tileLayer.on('tileload', () => {
        setTileError(false);
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // Initialize Layer Groups in specific z-order
      hotspotsLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      journeyLayerRef.current = L.layerGroup().addTo(map);
      helpPointsLayerRef.current = L.layerGroup().addTo(map);
      reportsLayerRef.current = L.layerGroup().addTo(map);
      searchLayerRef.current = L.layerGroup().addTo(map);
      customMarkerLayerRef.current = L.layerGroup().addTo(map);
      pulseLayerRef.current = L.layerGroup().addTo(map);
      userLayerRef.current = L.layerGroup().addTo(map);

      // Click listener delegating to current callback ref
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClickRef.current) {
          onMapClickRef.current(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      setMapInstance(map);
      if (onMapReadyRef.current) onMapReadyRef.current(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapInstance(null);
      }
    };
  }, []);

  // 2. Initial Center on User Position ONCE (only when no explicit custom marker is present)
  useEffect(() => {
    if (userLocation && !customMarker && mapInstanceRef.current && !initialCenteredRef.current) {
      mapInstanceRef.current.setView([userLocation.latitude, userLocation.longitude], 15);
      initialCenteredRef.current = true;
    }
  }, [userLocation, customMarker]);

  // 3. User Location Marker + Accuracy Circle
  useEffect(() => {
    if (!userLayerRef.current) return;
    userLayerRef.current.clearLayers();

    if (showUserLocation && userLocation) {
      const { latitude, longitude, accuracy } = userLocation;

      // Accuracy Circle
      if (accuracy && accuracy > 0) {
        const accuracyCircle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#3b82f6',
          weight: 1,
          opacity: 0.6,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
        });
        userLayerRef.current.addLayer(accuracyCircle);
      }

      // User Position Pin
      const userMarker = L.marker([latitude, longitude], {
        icon: createUserLocationIcon(),
        zIndexOffset: 1000,
      }).bindPopup(`
        <div style="font-family: sans-serif; color: #f8fafc; padding: 2px;">
          <h4 style="font-size: 12px; font-weight: 700; color: #60a5fa; margin: 0 0 4px 0;">📍 Your Current Location</h4>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
            ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E
          </p>
          ${accuracy ? `<p style="font-size: 10px; color: #94a3b8; margin: 2px 0 0 0;">Accuracy: ±${Math.round(accuracy)}m</p>` : ''}
        </div>
      `);

      userLayerRef.current.addLayer(userMarker);
    }
  }, [userLocation, showUserLocation]);

  // 4. Safety Reports Markers with Category & Filter Sync
  useEffect(() => {
    if (!reportsLayerRef.current) return;
    reportsLayerRef.current.clearLayers();

    const shouldShow = showReports && (filters?.showReports ?? true);
    if (!shouldShow) return;

    const allowedCategories = filters?.categories;

    reports.forEach((report) => {
      if (allowedCategories && !allowedCategories.includes(report.category)) {
        return;
      }

      const marker = L.marker([report.latitude, report.longitude], {
        icon: createSafetyReportIcon(report.category, report.severity),
      }).bindPopup(renderReportPopupHtml(report));

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(report));
      }

      reportsLayerRef.current?.addLayer(marker);
    });
  }, [reports, showReports, filters, onMarkerClick]);

  // 5. Help Points Markers with Type & Filter Sync
  useEffect(() => {
    if (!helpPointsLayerRef.current) return;
    helpPointsLayerRef.current.clearLayers();

    const shouldShow = showHelpPoints && (filters?.showHelpPoints ?? true);
    if (!shouldShow) return;

    const allowedTypes = filters?.helpPointTypes;

    helpPoints.forEach((hp) => {
      if (allowedTypes && !allowedTypes.includes(hp.type)) {
        return;
      }

      const marker = L.marker([hp.latitude, hp.longitude], {
        icon: createHelpPointIcon(hp.type),
      }).bindPopup(renderHelpPointPopupHtml(hp));

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(hp));
      }

      helpPointsLayerRef.current?.addLayer(marker);
    });
  }, [helpPoints, showHelpPoints, filters, onMarkerClick]);

  // 6. Safety Hotspot / Concern Area Circles
  useEffect(() => {
    if (!hotspotsLayerRef.current) return;
    hotspotsLayerRef.current.clearLayers();

    const shouldShow = showHotspots && (filters?.showHotspots ?? true);
    if (!shouldShow) return;

    hotspots.forEach((hs) => {
      let color = '#f59e0b';
      if (hs.level === 'elevated' || hs.level === 'higher') color = '#ea580c';
      if (hs.level === 'low') color = '#eab308';

      const circle = L.circle([hs.latitude, hs.longitude], {
        radius: hs.radius,
        color: color,
        weight: 1.5,
        opacity: 0.6,
        fillColor: color,
        fillOpacity: 0.16,
      }).bindPopup(renderHotspotPopupHtml(hs));

      hotspotsLayerRef.current?.addLayer(circle);
    });
  }, [hotspots, showHotspots, filters]);

  // 7. Active Journey Overlay (Planned Route + Recorded GPS Breadcrumbs)
  useEffect(() => {
    if (!journeyLayerRef.current) return;
    journeyLayerRef.current.clearLayers();

    if (!activeJourney) return;

    // Start Marker
    const startMarker = L.marker([activeJourney.start_latitude, activeJourney.start_longitude], {
      icon: createJourneyEndpointIcon(false),
      zIndexOffset: 800,
    }).bindPopup(`<b>Journey Start</b><br/>Commenced at ${activeJourney.title || 'Start point'}`);
    journeyLayerRef.current.addLayer(startMarker);

    // Destination Marker if coordinates exist
    if (activeJourney.destination_latitude && activeJourney.destination_longitude) {
      const destMarker = L.marker(
        [activeJourney.destination_latitude, activeJourney.destination_longitude],
        {
          icon: createJourneyEndpointIcon(true),
          zIndexOffset: 800,
        }
      ).bindPopup(`<b>Destination</b><br/>${activeJourney.destination_name}`);
      journeyLayerRef.current.addLayer(destMarker);
    }

    // Planned Route Geometry (Street-by-street path)
    if (activeJourney.route_geometry) {
      const latLngs = normalizeRouteCoordinates(activeJourney.route_geometry);
      if (latLngs.length > 1) {
        // Layer 1: White Halo Underneath (#FFFFFF, 14px)
        const plannedHalo = L.polyline(latLngs, {
          color: '#FFFFFF',
          weight: 14,
          opacity: 1.0,
          pane: 'routeHaloPane',
          lineCap: 'round',
          lineJoin: 'round',
        });
        journeyLayerRef.current.addLayer(plannedHalo);

        // Layer 2: Bright Green Route Line (#16A34A, 8px)
        const plannedPolyline = L.polyline(latLngs, {
          color: '#16A34A',
          weight: 8,
          opacity: 1.0,
          pane: 'routeLinesPane',
          lineCap: 'round',
          lineJoin: 'round',
        }).bindPopup(`
          <div style="font-family: sans-serif; color: #f8fafc; padding: 2px;">
            <b style="color: #4ade80;">Active Lower Estimated-Risk Route</b><br/>
            <span style="font-size: 11px; color: #cbd5e1;">
              Safety Level: ${(activeJourney.estimated_risk_level || 'assessed').toUpperCase()}
            </span>
          </div>
        `);
        journeyLayerRef.current.addLayer(plannedPolyline);
      }
    }

    // Recorded breadcrumb trail (Layer 3 on top of planned route)
    if (recordedJourneyPoints.length > 1) {
      const trailCoords: [number, number][] = recordedJourneyPoints.map((p) => [
        p.latitude,
        p.longitude,
      ]);

      const polyline = L.polyline(trailCoords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      });
      journeyLayerRef.current.addLayer(polyline);
    }
  }, [activeJourney, recordedJourneyPoints]);

  // 8. Candidate Routes Overlay (Step 10 & Professional Navigation Interface)
  useEffect(() => {
    if (!routesLayerRef.current) return;
    routesLayerRef.current.clearLayers();

    if (!candidateRoutes || candidateRoutes.length === 0) return;

    let selectedBounds: L.LatLngBounds | null = null;
    const allBounds = L.latLngBounds([]);

    // Sort candidate routes so unselected alternatives render first, and selected route renders last on top
    const sorted = [...candidateRoutes].sort((a, b) => {
      if (a.route_id === selectedRouteId) return 1;
      if (b.route_id === selectedRouteId) return -1;
      return 0;
    });

    const getRouteColor = (r: RouteAlternativeItem): string => {
      const sa = r.safety_assessment || r.risk_assessment;
      if (!sa) return '#64748B';
      if (sa.color_hex && sa.color_hex.startsWith('#')) return sa.color_hex;
      if (sa.color === 'green') return '#16A34A';
      if (sa.color === 'yellow') return '#EAB308';
      if (sa.color === 'red') return '#DC2626';
      if (sa.color === 'grey') return '#64748B';
      if (sa.score !== null && sa.score !== undefined) {
        if (sa.score >= 80) return '#16A34A';
        if (sa.score >= 50) return '#EAB308';
        return '#DC2626';
      }
      return '#64748B';
    };

    for (const route of sorted) {
      const isSelected = route.route_id === selectedRouteId;
      const latLngs = normalizeRouteCoordinates(route.geometry.coordinates);

      latLngs.forEach((pt) => allBounds.extend(pt));

      const routeColor = getRouteColor(route);
      const sa = route.safety_assessment || route.risk_assessment;
      const distKm = (route.distance_m / 1000).toFixed(1);
      const timeMins = Math.round(route.duration_seconds / 60);
      const scoreText = sa?.score !== null && sa?.score !== undefined ? `${sa.score}/100` : 'None';
      const riskLabel = sa?.label || (sa?.risk_level ? sa.risk_level.toUpperCase() : 'UNKNOWN');

      const popupHtml = `
        <div style="font-family: sans-serif; color: #f8fafc; padding: 4px; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${routeColor};"></span>
            <h4 style="font-size: 13px; font-weight: 800; color: #ffffff; margin: 0;">
              ${sa?.color?.toUpperCase() || 'ROUTE'} — ${riskLabel}
            </h4>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">
            ${distKm} km &bull; ~${timeMins} min
          </div>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px; line-height: 1.4;">
            Safety Score: <b style="color: ${routeColor}">${scoreText}</b><br/>
            Data Coverage: <b>${Math.round((sa?.data_coverage || 0) * 100)}%</b> &bull; ${sa?.confidence || 'insufficient'} confidence<br/>
            Verified Issues: <b>${route.distinct_verified_issues_count ?? (route.relevant_issues?.length || 0)}</b>
          </div>
        </div>
      `;

      if (isSelected) {
        // High-contrast white halo underneath for sharp visibility against streets
        const haloPolyline = L.polyline(latLngs, {
          color: '#FFFFFF',
          weight: 14,
          opacity: 1.0,
          pane: 'routeHaloPane',
          lineCap: 'round',
          lineJoin: 'round',
        });
        routesLayerRef.current?.addLayer(haloPolyline);

        // Primary selected route in its determined safety colour
        const mainPolyline = L.polyline(latLngs, {
          color: routeColor,
          weight: 8,
          opacity: 1.0,
          pane: 'routeLinesPane',
          lineCap: 'round',
          lineJoin: 'round',
        }).bindPopup(popupHtml);

        routesLayerRef.current?.addLayer(mainPolyline);
        selectedBounds = mainPolyline.getBounds();

        // Render verified hazard markers along the selected route corridor
        if (route.relevant_issues && route.relevant_issues.length > 0) {
          route.relevant_issues.forEach((iss) => {
            const hazardColor =
              iss.severity === 'CRITICAL' || iss.severity === 'HIGH'
                ? '#DC2626'
                : iss.severity === 'MEDIUM'
                ? '#EAB308'
                : '#10B981';

            const hazardMarker = L.circleMarker([iss.latitude, iss.longitude], {
              radius: 6,
              fillColor: hazardColor,
              color: '#FFFFFF',
              weight: 2,
              opacity: 1.0,
              fillOpacity: 0.95,
              pane: 'routeMarkersPane',
            }).bindPopup(`
              <div style="font-family: sans-serif; color: #f8fafc; padding: 4px; min-width: 180px;">
                <b style="color: ${hazardColor}; font-size: 12px;">${iss.category_label}</b> (${iss.severity})<br/>
                <span style="font-size: 11px; color: #e2e8f0;">${iss.description}</span><br/>
                <span style="font-size: 10px; color: #94a3b8;">${Math.round(iss.distance_from_route_m)}m from route corridor</span>
              </div>
            `);
            routesLayerRef.current?.addLayer(hazardMarker);
          });
        }
      } else {
        // Alternative routes: visible with lighter halo and slightly muted safety colour
        const altHalo = L.polyline(latLngs, {
          color: '#FFFFFF',
          weight: 8,
          opacity: 0.5,
          pane: 'routeHaloPane',
          lineCap: 'round',
          lineJoin: 'round',
        });

        const altPolyline = L.polyline(latLngs, {
          color: routeColor,
          weight: 5,
          opacity: 0.75,
          pane: 'routeLinesPane',
          lineCap: 'round',
          lineJoin: 'round',
        }).bindPopup(popupHtml);

        const handleAltClick = () => {
          if (onSelectRoute) onSelectRoute(route.route_id);
        };
        altHalo.on('click', handleAltClick);
        altPolyline.on('click', handleAltClick);

        routesLayerRef.current?.addLayer(altHalo);
        routesLayerRef.current?.addLayer(altPolyline);
      }
    }

    // Layer 5: Start & Destination Markers with clear distinct pins
    if (candidateRoutes.length > 0) {
      const first = candidateRoutes[0];
      const startMarker = L.marker([first.origin.latitude, first.origin.longitude], {
        icon: createJourneyEndpointIcon(false),
        zIndexOffset: 1200,
        pane: 'routeMarkersPane',
      }).bindPopup(`<b>Starting Point</b><br/>${first.origin.label || 'Origin'}`);

      const destMarker = L.marker([first.destination.latitude, first.destination.longitude], {
        icon: createJourneyEndpointIcon(true),
        zIndexOffset: 1200,
        pane: 'routeMarkersPane',
      }).bindPopup(`<b>Destination</b><br/>${first.destination.label || 'Destination'}`);

      routesLayerRef.current?.addLayer(startMarker);
      routesLayerRef.current?.addLayer(destMarker);
    }

    // Auto-fit map viewport when candidate routes change or new route is selected
    const currentRouteKey = `${selectedRouteId || 'none'}_${candidateRoutes.length}_${candidateRoutes[0]?.route_id || ''}`;
    if (mapInstanceRef.current && lastFittedRouteKeyRef.current !== currentRouteKey) {
      lastFittedRouteKeyRef.current = currentRouteKey;

      const isDesktop = window.innerWidth >= 1024;
      // Account for side panel on desktop (padding-left ~440px) or mobile sheet (padding-bottom ~260px)
      const padTopLeft: [number, number] = isDesktop && hasSidePanel ? [440, 60] : [60, 60];
      const padBottomRight: [number, number] = isDesktop ? [60, 60] : [60, 240];

      if (selectedBounds) {
        if (candidateRoutes[0]) {
          selectedBounds.extend([candidateRoutes[0].origin.latitude, candidateRoutes[0].origin.longitude]);
          selectedBounds.extend([candidateRoutes[0].destination.latitude, candidateRoutes[0].destination.longitude]);
        }
        mapInstanceRef.current.fitBounds(selectedBounds, {
          paddingTopLeft: padTopLeft,
          paddingBottomRight: padBottomRight,
          maxZoom: 17,
        });
      } else if (allBounds.isValid()) {
        mapInstanceRef.current.fitBounds(allBounds, {
          paddingTopLeft: padTopLeft,
          paddingBottomRight: padBottomRight,
          maxZoom: 17,
        });
      }
    }
  }, [candidateRoutes, selectedRouteId, onSelectRoute, hasSidePanel]);

  // 9. Search Result Drop Pin and FlyTo
  useEffect(() => {
    if (!searchLayerRef.current) return;
    searchLayerRef.current.clearLayers();

    if (searchResult) {
      const searchMarker = L.marker([searchResult.latitude, searchResult.longitude], {
        icon: createSearchMarkerIcon(),
        zIndexOffset: 1200,
      }).bindPopup(`
        <div style="font-family: sans-serif; color: #f8fafc; padding: 2px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #c084fc; margin: 0 0 3px 0;">🎯 ${searchResult.name}</h4>
          <p style="font-size: 11px; color: #cbd5e1; margin: 0;">${searchResult.displayName}</p>
        </div>
      `);

      searchLayerRef.current.addLayer(searchMarker);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([searchResult.latitude, searchResult.longitude], 16, {
          animate: true,
          duration: 1.2,
        });
        setTimeout(() => searchMarker.openPopup(), 1300);
      }
    }
  }, [searchResult]);

  // 10. Custom Marker Drop Pin (Used for Report Location Picker and Detail Page)
  useEffect(() => {
    if (!customMarkerLayerRef.current) return;
    customMarkerLayerRef.current.clearLayers();

    if (customMarker) {
      const pinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events:auto; cursor:pointer;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0284c7); color: white; padding: 6px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px; box-shadow: 0 4px 14px rgba(6,182,212,0.6), 0 0 0 2px #ffffff; display: flex; align-items: center; gap: 5px; white-space: nowrap; font-family: system-ui, sans-serif;">
              <span style="font-size: 13px;">${customMarker.icon || '📍'}</span>
              <span>${customMarker.label || 'Selected Location'}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #0284c7; margin-top: -1px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></div>
            <div style="width: 8px; height: 8px; background: rgba(6, 182, 212, 0.4); border-radius: 9999px; margin-top: -4px;"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -36],
      });

      const pinMarker = L.marker([customMarker.latitude, customMarker.longitude], {
        icon: pinIcon,
        zIndexOffset: 1500,
      }).bindPopup(`
        <div style="text-align: center; padding: 4px; font-family: system-ui, -apple-system, sans-serif; min-width: 140px;">
          <strong style="color: #0284c7; font-size: 12px; display: block; margin-bottom: 2px;">Selected Incident Location</strong>
          <span style="color: #334155; font-size: 11px; font-weight: 600; font-family: monospace; display: block;">
            Lat: ${customMarker.latitude.toFixed(5)}<br/>Lng: ${customMarker.longitude.toFixed(5)}
          </span>
        </div>
      `);

      customMarkerLayerRef.current.addLayer(pinMarker);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([customMarker.latitude, customMarker.longitude], {
          animate: true,
          duration: 0.6,
        });
      }
    }
  }, [customMarker]);

  // 11. Safety Pulse Assessment Geographic Scope Circle
  useEffect(() => {
    if (!pulseLayerRef.current) return;
    pulseLayerRef.current.clearLayers();

    if (pulseAssessment) {
      const circle = L.circle([pulseAssessment.latitude, pulseAssessment.longitude], {
        radius: pulseAssessment.radius,
        color: '#6366f1',
        weight: 2,
        dashArray: '5, 5',
        opacity: 0.8,
        fillColor: '#6366f1',
        fillOpacity: 0.08,
      });

      const centerIcon = L.divIcon({
        className: 'pulse-center-pin',
        html: `
          <div style="display:flex; align-items:center; justify-content:center; width:22px; height:22px; background: rgba(99,102,241,0.25); border: 2px solid #6366f1; border-radius: 9999px; box-shadow: 0 0 12px rgba(99,102,241,0.6);">
            <div style="width: 8px; height: 8px; background: #818cf8; border-radius: 9999px;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const centerMarker = L.marker([pulseAssessment.latitude, pulseAssessment.longitude], {
        icon: centerIcon,
        zIndexOffset: 1200,
      }).bindPopup(`<b>Safety Pulse Assessment Sector</b><br/>Radius: ${pulseAssessment.radius}m`);

      pulseLayerRef.current.addLayer(circle);
      pulseLayerRef.current.addLayer(centerMarker);
    }
  }, [pulseAssessment]);

  return (
    <div
      className={`relative w-full overflow-hidden ${className || 'h-full min-h-[450px] sm:min-h-[500px] lg:min-h-[600px]'}`}
      style={{ minHeight: '350px' }}
    >
      <div
        ref={mapContainerRef}
        id={canvasId}
        className="w-full h-full"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '350px',
          transform: is3D ? 'perspective(1100px) rotateX(24deg) scale(1.04)' : 'none',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: '50% 85%',
        }}
      />
      <MapResizeHandler map={mapInstance} containerRef={mapContainerRef} />
      {tileError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] max-w-sm px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
          <span>Map tiles could not be loaded. Please check your internet connection.</span>
          <button
            type="button"
            onClick={retryTiles}
            className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-white font-semibold underline text-[11px] shrink-0 transition"
          >
            Retry
          </button>
        </div>
      )}
      {/* Route Safety Colour Legend (Requirement 8) */}
      {candidateRoutes && candidateRoutes.length > 0 && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md text-[11px] space-y-1.5 hidden sm:block max-w-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Route Safety Analysis
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0 shadow-sm" />
              <span>Lower Risk (80–100)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] shrink-0 shadow-sm" />
              <span>Moderate (50–79)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0 shadow-sm" />
              <span>Higher Risk (0–49)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] shrink-0 shadow-sm" />
              <span>Insufficient Data</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeSphereMap;
