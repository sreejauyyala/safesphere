import React, { useState } from 'react';
import Map from '../components/Map';
import type { MapMarkerData, RouteData } from '../types';
import { MapPin, Eye } from 'lucide-react';

export const MapPage: React.FC = () => {
  const [centerLat] = useState<number>(12.9716);
  const [centerLng] = useState<number>(77.5946);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);

  // Foundation mock markers demonstrating safety reports & help points
  const [markers] = useState<MapMarkerData[]>([
    {
      id: 'rep-1',
      latitude: 12.9740,
      longitude: 77.5975,
      title: 'Broken Streetlight Hazard',
      description: 'Reported poor illumination along side alley. Verified by 3 users.',
      type: 'report',
      category: 'poor_lighting',
      status: 'verified'
    },
    {
      id: 'rep-2',
      latitude: 12.9690,
      longitude: 77.5920,
      title: 'Isolated Construction Passage',
      description: 'Temporary roadblock creating poorly lit bottleneck.',
      type: 'report',
      category: 'hazard',
      status: 'submitted'
    },
    {
      id: 'hp-1',
      latitude: 12.9760,
      longitude: 77.5995,
      title: 'Central Police Station',
      description: '24/7 Police Dispatch & Safe Haven Desk',
      type: 'help_point',
      category: 'police',
      status: 'active'
    },
    {
      id: 'hp-2',
      latitude: 12.9675,
      longitude: 77.5895,
      title: 'City Care Hospital 24/7 ER',
      description: 'Medical ER and Emergency Shelter point',
      type: 'help_point',
      category: 'hospital',
      status: 'active'
    }
  ]);

  // Foundation mock route demonstrating safety-optimized path
  const [routes] = useState<RouteData[]>([
    {
      id: 'route-safe-1',
      origin: { lat: 12.9716, lng: 77.5946 },
      destination: { lat: 12.9780, lng: 77.6000 },
      waypoints: [
        [12.9716, 77.5946],
        [12.9735, 77.5960],
        [12.9755, 77.5980],
        [12.9780, 77.6000]
      ],
      distance_meters: 1100,
      duration_seconds: 780,
      is_safety_optimized: true
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-rose-500" />
            Safety Map & Community Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            OpenStreetMap and Leaflet engine with live hazard markers, safe havens, and safety-aware routes.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            Active Pins: <strong className="text-indigo-400">{markers.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            Safe Path: <strong>Active</strong>
          </span>
        </div>
      </div>

      {/* Interactive Map Component Container */}
      <div className="relative">
        <Map
          latitude={centerLat}
          longitude={centerLng}
          zoom={14}
          markers={markers}
          routes={routes}
          onMarkerClick={(marker) => setSelectedMarker(marker)}
          className="h-[520px] w-full"
        />
      </div>

      {/* Selected Marker Detail Card / Placeholder Guide */}
      {selectedMarker ? (
        <div className="p-4 rounded-xl glass-card border border-slate-700 flex items-start justify-between">
          <div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              selectedMarker.type === 'report' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
            }`}>
              {selectedMarker.type}
            </span>
            <h3 className="font-bold text-slate-100 text-sm mt-1">{selectedMarker.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{selectedMarker.description}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Coordinates: {selectedMarker.latitude.toFixed(5)}, {selectedMarker.longitude.toFixed(5)}
            </p>
          </div>
          <button
            onClick={() => setSelectedMarker(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl glass-card border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Click any marker pin on the map to inspect safety telemetry details.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">Center: {centerLat}, {centerLng}</span>
        </div>
      )}
    </div>
  );
};

export default MapPage;
