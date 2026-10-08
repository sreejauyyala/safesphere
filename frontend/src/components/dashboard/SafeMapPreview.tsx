import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MapPin, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

export interface MapMarkerPreview {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'haven' | 'hazard' | 'user';
}

export interface SafeMapPreviewProps {
  userLocation?: { lat: number; lng: number } | null;
  markers?: MapMarkerPreview[];
  safetyZones?: Array<{ id: string; name: string; score: number }>;
  routes?: Array<{ id: string; name: string }>;
  onOpenMap?: () => void;
  className?: string;
}

export const SafeMapPreview: React.FC<SafeMapPreviewProps> = ({
  userLocation,
  markers = [],
  safetyZones = [],
  routes = [],
  onOpenMap,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    if (onOpenMap) {
      onOpenMap();
    } else {
      navigate('/map');
    }
  };

  return (
    <Card
      variant="card"
      className={`relative overflow-hidden ${className}`}
      icon={<Map className="w-5 h-5 text-blue-400" />}
      title="Safety Map Preview"
      subtitle="Live intelligence layer & 24/7 havens"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Open Full Map
        </Button>
      }
    >
      {/* Visual Map Canvas Placeholder */}
      <div className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/90 flex items-center justify-center">
        {/* Subtle Map Grid lines */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Radar Scan Ring */}
        <div className="absolute w-36 h-36 rounded-full border border-indigo-500/30 animate-ping opacity-25 pointer-events-none" />
        <div className="absolute w-60 h-60 rounded-full border border-indigo-500/20 pointer-events-none" />

        {/* Simulated Map Markers */}
        <div className="absolute top-10 left-12 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] text-slate-300 shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>24/7 Haven (Hospital)</span>
        </div>

        <div className="absolute bottom-12 right-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] text-slate-300 shadow">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Reported Lighting Issue</span>
        </div>

        {/* Center Target (User) */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-900/40">
            <MapPin className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-[10px] font-bold text-slate-200 mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800">
            {userLocation ? `${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}` : 'Your Approximate Sector'}
          </span>
        </div>

        {/* Bottom Banner */}
        <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Interactive Leaflet tiles connect in full map view
          </span>
          <span className="text-slate-500 hidden sm:inline">
            Active: {markers.length || 3} pins &bull; {routes.length || 1} path &bull; {safetyZones.length || 3} zones
          </span>
        </div>
      </div>
    </Card>
  );
};

export default SafeMapPreview;
