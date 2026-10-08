import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Eye, Radio, Lock, ArrowRight, Activity } from 'lucide-react';
import apiService from '../services/api';
import type { HealthStatus } from '../types';

export const LandingPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    apiService.getHealth()
      .then(setHealth)
      .catch((err) => console.log('API not reachable yet', err));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-6">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        SafeSphere 24/7 Community Intelligence &bull; Foundation Live
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
        Next-Generation{' '}
        <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-400 bg-clip-text text-transparent">
          Community Safety
        </span>{' '}
        Powered by AI & Live Telemetry
      </h1>

      <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
        Autonomous risk detection, verified safe routes, under-18 guardian protection, and instant SOS dispatch for women, students, shift workers, and cities.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold shadow-lg glow-rose transition-all duration-200"
        >
          <span>Explore Safety Map</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700 transition-colors"
        >
          <span>Join Network</span>
        </Link>
      </div>

      {/* Backend Status Card */}
      <div className="mt-12 w-full max-w-md p-4 rounded-xl glass-card border border-slate-800 text-left">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300">FastAPI Gateway Status</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            health ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {health ? 'HEALTH: OK' : 'PENDING'}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Endpoint: <span className="text-indigo-400">GET /api/v1/health</span>
        </p>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Service: <span className="text-slate-200">{health?.service || 'Connecting to backend...'}</span>
        </p>
      </div>

      {/* Feature Pillars Grid */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl text-left">
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-base mb-1">Safety-Aware Routes</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dynamic routing avoiding unlit alleys and verified hotspots with Leaflet and OpenStreetMap.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-base mb-1">Live SOS & Pulse</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            One-touch panic dispatch and 'I Feel Unsafe' silent monitoring for vulnerable commutes.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-base mb-1">Gemini AI Risk Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-modal analysis of reports, voice transcripts, and photo evidence with Google Gemini.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-base mb-1">Guardian Protection</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automated parental oversight and journey heartbeat check-ins for users under age 18.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
