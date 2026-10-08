import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  MapPin,
  Clock,
  Route,
  Pause,
  Play,
  Square,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import type { Journey, JourneySummary } from '../../types';
import { useLocation } from '../../contexts/LocationContext';
import apiService from '../../services/api';

interface ActiveJourneyCardProps {
  journey: Journey;
  onJourneyUpdated: (updated: Journey) => void;
  onJourneyEnded: (summary: JourneySummary) => void;
}

export const ActiveJourneyCard: React.FC<ActiveJourneyCardProps> = ({
  journey,
  onJourneyUpdated,
  onJourneyEnded,
}) => {
  const navigate = useNavigate();
  const { currentLocation, accuracy, stopLocationTracking, startLocationTracking } = useLocation();

  const [loadingAction, setLoadingAction] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Compute elapsed time periodically
  useEffect(() => {
    const computeElapsed = () => {
      const start = new Date(journey.started_at).getTime();
      const now = Date.now();
      const diffMins = Math.max(0, Math.floor((now - start) / 60000));
      setElapsedMinutes(diffMins);
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [journey.started_at]);

  const handlePause = async () => {
    setLoadingAction(true);
    try {
      const updated = await apiService.pauseJourney(journey.id);
      stopLocationTracking();
      onJourneyUpdated(updated);
    } catch (err) {
      console.error('Failed to pause journey:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResume = async () => {
    setLoadingAction(true);
    try {
      const updated = await apiService.resumeJourney(journey.id);
      startLocationTracking(journey.id);
      onJourneyUpdated(updated);
    } catch (err) {
      console.error('Failed to resume journey:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmEnd = async () => {
    setLoadingAction(true);
    try {
      stopLocationTracking();
      const summary = await apiService.endJourney(journey.id);
      setShowEndConfirm(false);
      onJourneyEnded(summary);
    } catch (err) {
      console.error('Failed to end journey:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const isPaused = journey.status === 'PAUSED';

  // Format start time string (e.g. 8:32 PM)
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <>
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
        {/* Header with live pulsing badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isPaused
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}
            >
              <Navigation className={`w-6 h-6 ${!isPaused ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Active SafeSphere Journey
              </span>
              <h3 className="text-xl font-bold text-white leading-tight">
                {journey.destination_name}
              </h3>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
              isPaused
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
              }`}
            />
            {isPaused ? '🟡 Tracking Paused' : '🟢 Tracking Active'}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-xs">
          <div>
            <span className="text-slate-500 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Started
            </span>
            <span className="font-semibold text-slate-200">
              {formatTime(journey.started_at)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Elapsed
            </span>
            <span className="font-semibold text-white">
              {elapsedMinutes} min
            </span>
          </div>

          <div>
            <span className="text-slate-500 flex items-center gap-1 mb-1">
              <Route className="w-3.5 h-3.5 text-emerald-400" />
              Distance
            </span>
            <span className="font-semibold text-emerald-400">
              {journey.distance_travelled.toFixed(2)} km
            </span>
          </div>

          <div>
            <span className="text-slate-500 flex items-center gap-1 mb-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              GPS Status
            </span>
            <span className="font-semibold text-slate-200">
              {isPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
        </div>

        {/* Current Location readout */}
        <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Current: {currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 'Detecting GPS...'}
            </span>
          </div>
          {accuracy !== null && (
            <span className="text-slate-400 text-[11px]">
              Accuracy: ±{Math.round(accuracy)}m
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => navigate('/map')}
            className="flex-1 py-3 px-4 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition"
          >
            <MapPin className="w-4 h-4 text-blue-400" />
            Open Map
          </button>

          {isPaused ? (
            <button
              onClick={handleResume}
              disabled={loadingAction}
              className="flex-1 py-3 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Resume Tracking
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={loadingAction}
              className="flex-1 py-3 px-4 rounded-xl font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              Pause Tracking
            </button>
          )}

          <button
            onClick={() => setShowEndConfirm(true)}
            disabled={loadingAction}
            className="py-3 px-5 rounded-xl font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            <Square className="w-4 h-4" />
            End Journey
          </button>
        </div>
      </div>

      {/* End Journey Confirmation Dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-lg font-bold text-white mb-2">End This Journey?</h4>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              SafeSphere will stop live GPS tracking and finalize your travel summary.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                disabled={loadingAction}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {loadingAction ? 'Ending...' : 'End Journey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveJourneyCard;
