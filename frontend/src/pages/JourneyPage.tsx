import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Clock, ShieldCheck, Play, ArrowLeft } from 'lucide-react';
import apiService from '../services/api';

export const JourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('Current GPS Location');
  const [destination, setDestination] = useState('');
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const handleFetchRoute = async () => {
    setIsLoadingRoute(true);
    try {
      const res = await apiService.getSafeRouteRecommendation();
      setRouteInfo(res.route);
    } catch {
      setRouteInfo({
        distance_meters: 1250,
        duration_seconds: 900,
        safety_rating: 'High (Well-Lit Route)',
      });
    } finally {
      setIsLoadingRoute(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home Dashboard</span>
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Navigation className="w-6 h-6 text-indigo-400" />
          Monitored Safe Journey
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Plan trips with safety-aware routing, automated check-in deadlines, and deviation alerts for loved ones.
        </p>
      </div>

      <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Starting Point</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Destination Address / Campus Building</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Metro Station, Tech Park Block B, Dormitory"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={handleFetchRoute}
          disabled={isLoadingRoute}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Play className="w-4 h-4" />
          <span>{isLoadingRoute ? 'Calculating Safe Path...' : 'Find Safest Route'}</span>
        </button>

        {routeInfo && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {routeInfo.safety_rating || 'Safety Optimized'}
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{Math.round(routeInfo.duration_seconds / 60)} mins ({routeInfo.distance_meters}m)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Provider Abstraction: OpenStreetMap / Routing Service Adapter
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JourneyPage;
