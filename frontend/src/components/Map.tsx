import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapMarkerData, RouteData } from '../types';

interface MapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: MapMarkerData[];
  routes?: RouteData[];
  safetyData?: any;
  onMarkerClick?: (marker: MapMarkerData) => void;
  className?: string;
  showCurrentLocation?: boolean;
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
const createCustomMarkerIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export const Map: React.FC<MapProps> = ({
  latitude = 12.9716,
  longitude = 77.5946,
  zoom = 14,
  markers = [],
  routes = [],
  safetyData: _safetyData,
  onMarkerClick,
  className = 'h-[500px] w-full',
  showCurrentLocation = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map and OSM Tile Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([latitude, longitude], zoom);

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

  // Sync Center and Zoom
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], zoom);
    }
  }, [latitude, longitude, zoom]);

  // Update Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Current location marker
    if (showCurrentLocation) {
      const userMarker = L.marker([latitude, longitude], {
        icon: createCustomMarkerIcon('#3b82f6'),
      }).bindPopup(`<b>Your Current Location</b><br/>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      markersLayerRef.current.addLayer(userMarker);
    }

    // Safety Reports, Help Points & Custom Markers
    markers.forEach((m) => {
      let pinColor = '#10b981'; // Green for safe / help
      if (m.type === 'report') pinColor = '#f43f5e'; // Rose / red for hazard
      if (m.type === 'help_point') pinColor = '#06b6d4'; // Cyan for help points

      const marker = L.marker([m.latitude, m.longitude], {
        icon: createCustomMarkerIcon(pinColor),
      }).bindPopup(`
        <div style="font-family: sans-serif; min-width: 150px;">
          <h4 style="font-weight: bold; margin-bottom: 4px; color: #111827;">${m.title}</h4>
          <p style="margin: 0; font-size: 12px; color: #4b5563;">${m.description || m.type}</p>
        </div>
      `);

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(m));
      }

      markersLayerRef.current?.addLayer(marker);
    });
  }, [markers, latitude, longitude, showCurrentLocation, onMarkerClick]);

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
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 text-xs text-slate-200 shadow-lg flex items-center space-x-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Hazards
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Help Points
        </span>
        {routes.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span> Safe Path
          </span>
        )}
      </div>
    </div>
  );
};

export default Map;
