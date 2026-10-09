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
  Share2,
  Check,
  Copy,
  X,
} from 'lucide-react';
import type { Journey, JourneySummary, ShareSessionResponse } from '../../types';
import { useLocation } from '../../contexts/LocationContext';
import apiService from '../../services/api';
import trustedCircleService from '../../services/trustedCircleService';

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

  // Live Location Sharing (Step 12)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSession, setShareSession] = useState<ShareSessionResponse | null>(null);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpenShare = async () => {
    setShowShareModal(true);
    if (!shareSession) {
      setIsSharingLoading(true);
      try {
        const session = await trustedCircleService.createSharingSession(journey.id, 4);
        setShareSession(session);
      } catch (err) {
        console.error('Failed to create sharing session:', err);
      } finally {
        setIsSharingLoading(false);
      }
    }
  };

  const handleCopyLink = () => {
    if (!shareSession) return;
    const url = `${window.location.origin}${shareSession.share_url}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevokeShare = async () => {
    if (!shareSession) return;
    try {
      await trustedCircleService.revokeSharingSession(shareSession.id);
      setShareSession(null);
      setShowShareModal(false);
    } catch (err) {
      console.error('Failed to revoke sharing session:', err);
    }
  };

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

        {/* Planned Safety Route Corridor Info (Step 10) */}
        {(journey.planned_distance_m || journey.estimated_risk_level) && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">
                Planned Route: <strong className="text-white capitalize">{(journey.estimated_risk_level || 'Assessed').replace(/_/g, ' ')} Risk</strong>
                {journey.planned_distance_m ? ` (${(journey.planned_distance_m / 1000).toFixed(1)} km)` : ''}
              </span>
            </div>
            {journey.route_data_coverage !== undefined && journey.route_data_coverage !== null && (
              <span className="text-slate-400 text-[11px]">
                Data Coverage: {Math.round(journey.route_data_coverage * 100)}%
              </span>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => navigate('/map')}
            className="flex-1 py-3 px-4 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition"
          >
            <MapPin className="w-4 h-4 text-blue-400" />
            Open Map
          </button>

          <button
            onClick={handleOpenShare}
            className="py-3 px-4 rounded-xl font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center gap-2 transition"
            title="Share live location with trusted contacts or guardian"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span>Share Live</span>
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

      {/* Share Live Link Modal (Step 12) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Share Live Journey</h4>
                  <p className="text-[11px] text-slate-400">Cryptographically secure, time-limited link</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSharingLoading ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Generating secure access token...</p>
              </div>
            ) : shareSession ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Anyone with this link can view your live GPS position and travel route in real-time until you complete your journey or revoke access.
                </p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-indigo-300 truncate">
                    {window.location.origin}{shareSession.share_url}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Valid For:</span>
                    <span className="text-slate-200 font-medium">4 Hours (or until journey ends)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Access Level:</span>
                    <span className="text-slate-200 font-medium">Read-Only Live Telemetry</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeShare}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition"
                  >
                    Revoke Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-rose-400">
                Failed to create sharing session. Please try again.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveJourneyCard;
