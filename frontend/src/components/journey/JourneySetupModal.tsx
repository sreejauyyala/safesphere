import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  MapPin,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import apiService from '../../services/api';
import type { Journey, RouteAlternativeItem } from '../../types';
import RoutePlanner from '../route/RoutePlanner';

interface JourneySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJourneyStarted?: (journey: Journey) => void;
  initialMode?: 'planner' | 'quick';
}

export const JourneySetupModal: React.FC<JourneySetupModalProps> = ({
  isOpen,
  onClose,
  onJourneyStarted,
  initialMode = 'planner',
}) => {
  const navigate = useNavigate();
  const {
    currentLocation,
    isLocationEnabled,
    requestLocation,
    startLocationTracking,
  } = useLocation();

  const [mode, setMode] = useState<'planner' | 'quick'>(initialMode);
  const [destination, setDestination] = useState('');
  const [label, setLabel] = useState<'Home' | 'College' | 'Office' | 'Other'>('Home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeExistingJourney, setActiveExistingJourney] = useState<Journey | null>(null);

  // Check if an active journey already exists when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setMode(initialMode);
      apiService
        .getActiveJourney()
        .then((active) => {
          if (active) {
            setActiveExistingJourney(active);
          } else {
            setActiveExistingJourney(null);
          }
        })
        .catch(() => {
          setActiveExistingJourney(null);
        });

      // If location is not yet detected, try fetching
      if (!isLocationEnabled) {
        requestLocation();
      }
    }
  }, [isOpen, initialMode, isLocationEnabled, requestLocation]);

  if (!isOpen) return null;

  // Handler for starting journey from Step 10 Safety-Aware Route Planner
  const handleStartWithSelectedRoute = async (selectedRoute: RouteAlternativeItem) => {
    setError(null);
    setLoading(true);

    try {
      const destLabel = selectedRoute.destination.label || 'Destination';
      const newJourney = await apiService.createJourney({
        destination_name: destLabel,
        title: `${selectedRoute.route_type.replace(/_/g, ' ').toUpperCase()} Commute`,
        start_latitude: selectedRoute.origin.latitude,
        start_longitude: selectedRoute.origin.longitude,
        destination_latitude: selectedRoute.destination.latitude,
        destination_longitude: selectedRoute.destination.longitude,
        // Step 10 Planned Route integration
        selected_route_id: selectedRoute.route_id,
        route_provider: selectedRoute.provider,
        route_geometry: JSON.stringify(selectedRoute.geometry.coordinates),
        planned_distance_m: selectedRoute.distance_m,
        planned_duration_seconds: selectedRoute.duration_seconds,
        estimated_risk_level: selectedRoute.risk_assessment.risk_level,
        route_data_coverage: selectedRoute.risk_assessment.data_coverage,
        route_assessed_at: new Date().toISOString(),
      });

      // Start live GPS tracking (Step 4 engine)
      startLocationTracking(newJourney.id);

      if (onJourneyStarted) {
        onJourneyStarted(newJourney);
      }
      onClose();
      navigate('/journey');
    } catch (err: any) {
      if (err.status === 409 || err.response?.status === 409) {
        setError('You already have an active journey. Please continue or end it first.');
        const active = await apiService.getActiveJourney();
        if (active) setActiveExistingJourney(active);
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to start journey. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for Quick Start
  const handleQuickStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destination.trim()) {
      setError('Please enter a destination.');
      return;
    }

    let coords = currentLocation;
    if (!coords) {
      coords = await requestLocation();
      if (!coords) {
        setError('Location permission is required to start a SafeSphere journey.');
        return;
      }
    }

    setLoading(true);
    try {
      const newJourney = await apiService.createJourney({
        destination_name: destination.trim(),
        title: `${label} Commute`,
        start_latitude: coords.latitude,
        start_longitude: coords.longitude,
      });

      // Start live GPS watcher with journey ID
      startLocationTracking(newJourney.id);

      if (onJourneyStarted) {
        onJourneyStarted(newJourney);
      }
      onClose();
      navigate('/journey');
    } catch (err: any) {
      if (err.status === 409 || err.response?.status === 409) {
        setError('You already have an active journey. Please continue or end it first.');
        const active = await apiService.getActiveJourney();
        if (active) setActiveExistingJourney(active);
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to start journey. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndExisting = async () => {
    if (!activeExistingJourney) return;
    setLoading(true);
    try {
      await apiService.endJourney(activeExistingJourney.id);
      setActiveExistingJourney(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to end previous journey.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Plan & Start SafeSphere Journey</h3>
            <p className="text-xs text-slate-400">
              Safety Pulse intelligence, road alternatives, and GPS tracking
            </p>
          </div>
        </div>

        {/* Active Journey Conflict */}
        {activeExistingJourney ? (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <ShieldAlert className="w-5 h-5" />
                <span>You already have an active journey</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Destination: <span className="font-bold text-white">{activeExistingJourney.destination_name}</span>
                <br />
                Status: <span className="font-semibold text-emerald-400">{activeExistingJourney.status}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/journey');
                }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition"
              >
                Continue Journey
              </button>
              <button
                type="button"
                onClick={handleEndExisting}
                disabled={loading}
                className="py-3 px-4 rounded-xl font-medium bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
              >
                {loading ? 'Ending...' : 'End Journey'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('planner')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  mode === 'planner'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Safety-Aware Route Planner</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                  mode === 'quick'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Quick Commute</span>
              </button>
            </div>

            {/* TAB 1: Route Planner (Step 10 Core Workflow) */}
            {mode === 'planner' && (
              <RoutePlanner
                onStartJourneyWithRoute={handleStartWithSelectedRoute}
                isStartingJourney={loading}
              />
            )}

            {/* TAB 2: Quick Commute Form */}
            {mode === 'quick' && (
              <form onSubmit={handleQuickStart} className="space-y-4">
                {/* GPS Status Indicator */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Location:</span>
                    {currentLocation ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        📍 Detected ({currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Acquiring GPS (Click to grant)
                      </button>
                    )}
                  </div>
                </div>

                {/* Destination Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Central Library, Home, Metro Station"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                  />
                </div>

                {/* Journey Label */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Journey Label
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Home', 'College', 'Office', 'Other'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setLabel(item)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                          label === item
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 flex items-start gap-2 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {loading ? 'Initiating...' : 'Start Quick Journey'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-4 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JourneySetupModal;
