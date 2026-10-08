import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import type { MapMarkerData, RouteData } from '../types';

interface MapProps {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  zoom?: number;
  userLocation?: { latitude: number; longitude: number; accuracy?: number | null } | null;
  followUser?: boolean;
  markers?: MapMarkerData[];
  routes?: RouteData[];
  safetyMarkers?: any[];
  helpPoints?: any[];
  safetyZones?: any[];
  onMarkerClick?: (marker: MapMarkerData) => void;
  className?: string;
  showCurrentLocation?: boolean;
  showRecenterButton?: boolean;
}

// Fix Leaflet's standard icon asset URLs for Vite bundler
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored markers for categories
const createCustomMarkerIcon = (color: string, isLiveUser: boolean = false) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: ${isLiveUser ? '28px' : '24px'};
        height: ${isLiveUser ? '28px' : '24px'};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 14px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: isLiveUser ? [28, 28] : [24, 24],
    iconAnchor: isLiveUser ? [14, 14] : [12, 12],
  });
};

export const Map: React.FC<MapProps> = ({
  latitude = 12.9716,
  longitude = 77.5946,
  accuracy = null,
  zoom = 14,
  userLocation,
  followUser = false,
  markers = [],
  routes = [],
  safetyMarkers: _safetyMarkers,
  helpPoints: _helpPoints,
  safetyZones: _safetyZones,
  onMarkerClick,
  className = 'h-[500px] w-full',
  showCurrentLocation = true,
  showRecenterButton = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // Active coordinates: prioritize userLocation if passed
  const activeLat = userLocation?.latitude ?? latitude;
  const activeLng = userLocation?.longitude ?? longitude;
  const activeAccuracy = userLocation?.accuracy ?? accuracy;

  // Initialize Map and OSM Tile Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([activeLat, activeLng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Center when coordinates change or when followUser is active
  useEffect(() => {
    if (mapInstanceRef.current) {
      if (followUser) {
        mapInstanceRef.current.panTo([activeLat, activeLng], { animate: true });
      } else {
        mapInstanceRef.current.setView([activeLat, activeLng], mapInstanceRef.current.getZoom());
      }
    }
  }, [activeLat, activeLng, followUser]);

  // Handle Recenter
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([activeLat, activeLng], 15, { animate: true, duration: 1.2 });
    }
  };

  // Update Markers & Accuracy Circle
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Accuracy Circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }

    // Current user location marker
    if (showCurrentLocation) {
      const userMarker = L.marker([activeLat, activeLng], {
        icon: createCustomMarkerIcon('#3b82f6', true),
        zIndexOffset: 1000,
      }).bindPopup(`
        <div style="font-family: sans-serif; min-width: 140px; padding: 2px;">
          <h4 style="font-weight: bold; margin: 0 0 4px; color: #1e40af;">📍 Your Live Location</h4>
          <p style="margin: 0; font-size: 11px; color: #475569;">
            Lat: ${activeLat.toFixed(5)}<br/>
            Lng: ${activeLng.toFixed(5)}<br/>
            ${activeAccuracy ? `Accuracy: ±${Math.round(activeAccuracy)}m` : ''}
          </p>
        </div>
      `);
      markersLayerRef.current.addLayer(userMarker);

      // Render accuracy circle if accuracy is known
      if (activeAccuracy && activeAccuracy > 0 && mapInstanceRef.current) {
        accuracyCircleRef.current = L.circle([activeLat, activeLng], {
          radius: activeAccuracy,
          color: '#3b82f6',
          weight: 1,
          opacity: 0.5,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
        }).addTo(mapInstanceRef.current);
      }
    }

    // Safety Reports, Help Points & Custom Markers
    markers.forEach((m) => {
      let pinColor = '#10b981'; // Green for safe / checkpoint
      if (m.type === 'report') pinColor = '#f43f5e'; // Rose / red for hazard
      if (m.type === 'help_point') pinColor = '#06b6d4'; // Cyan for help points

      const marker = L.marker([m.latitude, m.longitude], {
        icon: createCustomMarkerIcon(pinColor),
      }).bindPopup(`
        <div style="font-family: sans-serif; min-width: 150px; padding: 2px;">
          <h4 style="font-weight: bold; margin-bottom: 4px; color: #111827;">${m.title}</h4>
          <p style="margin: 0; font-size: 12px; color: #4b5563;">${m.description || m.type}</p>
        </div>
      `);

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(m));
      }

      markersLayerRef.current?.addLayer(marker);
    });
  }, [markers, activeLat, activeLng, activeAccuracy, showCurrentLocation, onMarkerClick]);

  // Update Routes
  useEffect(() => {
    if (!routesLayerRef.current) return;
    routesLayerRef.current.clearLayers();

    routes.forEach((route) => {
      if (route.waypoints && route.waypoints.length > 0) {
        const polyline = L.polyline(route.waypoints, {
          color: route.is_safety_optimized ? '#10b981' : '#6366f1',
          weight: 5,
          opacity: 0.8,
          dashArray: route.is_safety_optimized ? undefined : '5, 10',
        });
        routesLayerRef.current?.addLayer(polyline);
      }
    });
  }, [routes]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className={className} />

      {/* Recenter Button Overlay */}
      {showRecenterButton && showCurrentLocation && (
        <button
          onClick={handleRecenter}
          className="absolute top-4 right-4 z-[1000] p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-lg backdrop-blur-md transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
          title="Recenter on current location"
          aria-label="Recenter on current location"
        >
          <LocateFixed className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Recenter</span>
        </button>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 text-xs text-slate-200 shadow-lg flex items-center space-x-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm"></span> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Hazards
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Help Points
        </span>
        {routes.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span> Recorded Path
          </span>
        )}
      </div>
    </div>
  );
};

export default Map;
