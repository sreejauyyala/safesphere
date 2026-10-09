import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame,
  Info,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Clock,
  Compass,
  Navigation,
  Sun,
  Sunset,
  Moon,
  Sunrise,
  Layers,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useLocation } from '../../contexts/LocationContext';
import LocationPermissionModal from '../location/LocationPermissionModal';
import { safetyPulseService } from '../../services/safetyPulseService';
import type { SafetyPulseResponse } from '../../types';
import SafetyPulseExplanation from './SafetyPulseExplanation';

export interface SafetyPulseCardProps {
  className?: string;
  externalLat?: number | null;
  externalLon?: number | null;
  onScoreLoaded?: (data: SafetyPulseResponse | null) => void;
}

export const SafetyPulseCard: React.FC<SafetyPulseCardProps> = ({
  className = '',
  externalLat = null,
  externalLon = null,
  onScoreLoaded,
}) => {
  const { currentLocation } = useLocation();

  const [radius, setRadius] = useState<number>(500);
  const [timeContext, setTimeContext] = useState<string>('all');
  const [pulseData, setPulseData] = useState<SafetyPulseResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState<boolean>(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState<boolean>(false);

  // Determine active coordinates (either externally passed or current device GPS)
  const activeLat = externalLat ?? currentLocation?.latitude ?? null;
  const activeLon = externalLon ?? currentLocation?.longitude ?? null;

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSafetyPulse = useCallback(async () => {
    if (activeLat === null || activeLon === null) {
      setPulseData(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const data = await safetyPulseService.getSafetyPulse(
        activeLat,
        activeLon,
        radius,
        timeContext === 'all' ? null : timeContext,
        abortControllerRef.current.signal
      );
      setPulseData(data);
      if (onScoreLoaded) {
        onScoreLoaded(data);
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Failed to calculate safety pulse:', err);
      setError('Safety Pulse is temporarily unavailable.');
      setPulseData(null);
      if (onScoreLoaded) {
        onScoreLoaded(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeLat, activeLon, radius, timeContext, onScoreLoaded]);

  // Debounced fetch on coordinate or parameter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSafetyPulse();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSafetyPulse]);

  // Score Color Mapping
  const getScoreTheme = (score: number | null, status: string) => {
    if (status === 'insufficient_data' || score === null) {
      return {
        text: 'text-slate-400',
        bg: 'bg-slate-800/80',
        border: 'border-slate-700',
        label: 'Insufficient data to estimate local safety conditions',
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        glow: 'slate',
      };
    }
    if (score >= 80) {
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/30',
        label: 'Lower estimated risk',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        glow: 'emerald',
      };
    }
    if (score >= 60) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/30',
        label: 'Moderate estimated risk',
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        glow: 'amber',
      };
    }
    if (score >= 40) {
      return {
        text: 'text-orange-400',
        bg: 'bg-orange-950/40',
        border: 'border-orange-500/30',
        label: 'Elevated estimated risk',
        badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        glow: 'orange',
      };
    }
    return {
      text: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/30',
      label: 'Higher estimated risk',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'rose',
    };
  };

  const theme = getScoreTheme(pulseData?.score ?? null, pulseData?.status ?? 'insufficient_data');

  return (
    <>
      <Card
        variant="panel"
        glow="blue"
        className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-indigo-900/40 ${className}`}
      >
        {/* Background Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Flame className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                SAFETY PULSE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Territorial Risk Estimation Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic community intelligence & verified hazard indexing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSafetyPulse()}
              disabled={isLoading || !activeLat}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-700/60 disabled:opacity-40"
              title="Refresh Safety Pulse"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExplanationOpen(true)}
              leftIcon={<HelpCircle className="w-3.5 h-3.5 text-indigo-400" />}
              className="text-xs"
            >
              Why this score?
            </Button>
          </div>
        </div>

        {/* 2. Interactive Filter Controls (Radius & Time Context) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs">
          {/* Radius Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <span className="px-2 text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Radius
            </span>
            {[250, 500, 1000, 2000].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  radius === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </button>
            ))}
          </div>

          {/* Time Context Selector */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <span className="px-2 text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              Time
            </span>
            {[
              { id: 'all', label: 'Neutral', icon: Clock },
              { id: 'morning', label: 'Morning', icon: Sunrise },
              { id: 'afternoon', label: 'Afternoon', icon: Sun },
              { id: 'evening', label: 'Evening', icon: Sunset },
              { id: 'night', label: 'Night', icon: Moon },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeContext(t.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                    timeContext === t.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Main Content Based on State */}
        {/* State A: Location Disabled */}
        {!activeLat ? (
          <div className="my-6 p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  Enable location to view local safety conditions.
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  SafeSphere calculates localized safety scores within your proximity.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPermissionModalOpen(true)}
              leftIcon={<Navigation className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              Enable Location
            </Button>
          </div>
        ) : error ? (
          /* State B: Backend Error */
          <div className="my-6 p-6 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-rose-300">
                  Safety Pulse is temporarily unavailable.
                </h4>
                <p className="text-xs text-rose-400/80 mt-0.5">
                  Unable to connect to territorial risk calculation service.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSafetyPulse()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>
        ) : pulseData?.status === 'insufficient_data' ? (
          /* State C: Insufficient Data */
          <div className="my-6 p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-black text-slate-500 tracking-tight">--</span>
                <span className="text-xl font-bold text-slate-600">/ 100</span>
                <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Insufficient data
                </span>
              </div>
              <p className="text-xs font-medium text-amber-300/90 pt-1">
                Not enough verified safety information for this area.
              </p>
              <p className="text-[11px] text-slate-500">
                A missing score does not imply that this location is safe.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-right">
              <span className="text-[11px] text-slate-500">
                Data Confidence: <strong className="text-slate-300 capitalize">Insufficient</strong>
              </span>
              <span className="text-[11px] text-slate-500">
                Assessment Sector: <strong className="text-slate-300">{radius}m radius</strong>
              </span>
            </div>
          </div>
        ) : (
          /* State D: Available Score Display */
          <div className="my-6 p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl sm:text-6xl font-black tracking-tight ${theme.text}`}>
                {pulseData?.score}
              </span>
              <span className="text-xl font-bold text-slate-500">/ 100</span>
              <div className="ml-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${theme.badgeBg}`}>
                  {theme.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Data Confidence</span>
                <span className="font-bold text-slate-200 capitalize">
                  {pulseData?.confidence}
                </span>
              </div>
              <div className="border-l border-slate-800/80 pl-4">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Freshness</span>
                <span className="font-bold text-slate-200 capitalize">
                  {pulseData?.data_freshness}
                </span>
              </div>
              <div className="border-l border-slate-800/80 pl-4">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Last Assessed</span>
                <span className="font-semibold text-slate-300">
                  {pulseData?.evaluated_at ? new Date(pulseData.evaluated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Strongest Contributing Signals List */}
        {pulseData && pulseData.strongest_signals && pulseData.strongest_signals.length > 0 && (
          <div className="space-y-2 pt-1 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Strongest Signals Detected (~{radius}m):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {pulseData.strongest_signals.slice(0, 4).map((sig) => (
                <div
                  key={sig.id}
                  className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/70 flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200 truncate capitalize">
                        {sig.title || sig.category.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {sig.category.replace('_', ' ')} &bull; ~{sig.distance_m}m away
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                    {sig.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Metrics Footer Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs pt-2">
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-500 block uppercase">Verified Hazards</span>
            <span className="font-bold text-slate-200">
              {pulseData?.verified_unresolved_reports ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-500 block uppercase">Resolved Issues</span>
            <span className="font-bold text-emerald-400">
              {pulseData?.verified_resolved_reports ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-500 block uppercase">Help Havens</span>
            <span className="font-bold text-sky-400">
              {pulseData?.verified_help_points_count ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-500 block uppercase">Pending Review</span>
            <span className="font-bold text-amber-400">
              {pulseData?.pending_reports_count ?? 0}
            </span>
          </div>
        </div>

        {/* 6. Responsible Use Disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Safety Pulse is an estimate based on available safety information. It does not guarantee safety or predict crime. Missing reports do not mean that an area is safe.
          </p>
        </div>
      </Card>

      <SafetyPulseExplanation
        isOpen={explanationOpen}
        onClose={() => setExplanationOpen(false)}
        data={pulseData}
      />

      <LocationPermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
      />
    </>
  );
};

export default SafetyPulseCard;
