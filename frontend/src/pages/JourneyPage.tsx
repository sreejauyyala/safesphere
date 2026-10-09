import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Plus, ArrowLeft, RefreshCw, Route, MapPin } from 'lucide-react';
import type { Journey, JourneySummary, JourneyLocationPoint } from '../types';
import apiService from '../services/api';
import { useLocation } from '../contexts/LocationContext';
import ActiveJourneyCard from '../components/journey/ActiveJourneyCard';
import JourneySetupModal from '../components/journey/JourneySetupModal';
import JourneySummaryModal from '../components/journey/JourneySummaryModal';
import JourneyHistoryList from '../components/journey/JourneyHistoryList';
import SafeSphereMap from '../components/map/SafeSphereMap';

export const JourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const { startLocationTracking, stopLocationTracking, currentLocation } = useLocation();

  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [recordedJourneyPoints, setRecordedJourneyPoints] = useState<JourneyLocationPoint[]>([]);
  const [historyJourneys, setHistoryJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<'planner' | 'quick'>('planner');
  const [completedSummary, setCompletedSummary] = useState<JourneySummary | null>(null);

  const openPlanJourney = (m: 'planner' | 'quick' = 'planner') => {
    setSetupMode(m);
    setIsSetupOpen(true);
  };

  const fetchJourneysData = useCallback(async () => {
    setLoading(true);
    try {
      const [active, history] = await Promise.all([
        apiService.getActiveJourney(),
        apiService.getUserJourneys(),
      ]);

      if (active) {
        setActiveJourney(active);
        // Ensure live tracking is connected if status is ACTIVE
        if (active.status === 'ACTIVE') {
          startLocationTracking(active.id);
        }
        try {
          const points = await apiService.getJourneyLocationPoints(active.id);
          setRecordedJourneyPoints(points || []);
        } catch {
          setRecordedJourneyPoints([]);
        }
      } else {
        setActiveJourney(null);
        setRecordedJourneyPoints([]);
      }

      setHistoryJourneys(history || []);
    } catch (err) {
      console.error('Error fetching journeys:', err);
    } finally {
      setLoading(false);
    }
  }, [startLocationTracking]);

  useEffect(() => {
    fetchJourneysData();
  }, [fetchJourneysData]);

  const handleJourneyStarted = (newJourney: Journey) => {
    setActiveJourney(newJourney);
    setHistoryJourneys((prev) => [newJourney, ...prev.filter((j) => j.id !== newJourney.id)]);
  };

  const handleJourneyUpdated = (updated: Journey) => {
    setActiveJourney(updated);
    setHistoryJourneys((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  };

  const handleJourneyEnded = (summary: JourneySummary) => {
    stopLocationTracking();
    setActiveJourney(null);
    setCompletedSummary(summary);
    fetchJourneysData();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-500" />
            Live Journey Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS breadcrumbs, travel distance telemetry, and journey history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchJourneysData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {!activeJourney && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openPlanJourney('planner')}
                className="py-2.5 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/25"
              >
                <Route className="w-4 h-4" />
                Plan a Safe Journey
              </button>
              <button
                type="button"
                onClick={() => openPlanJourney('quick')}
                className="py-2.5 px-3 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
              >
                <Plus className="w-4 h-4" />
                Quick Start
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Journey Section */}
      {activeJourney && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Live Journey
            </h2>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Full Interactive Map</span>
            </button>
          </div>

          {/* Embedded Navigation Map */}
          <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80 w-full relative shadow-2xl">
            <SafeSphereMap
              userLocation={currentLocation}
              activeJourney={activeJourney}
              recordedJourneyPoints={recordedJourneyPoints}
              className="w-full h-full min-h-[280px]"
            />
          </div>

          <ActiveJourneyCard
            journey={activeJourney}
            onJourneyUpdated={handleJourneyUpdated}
            onJourneyEnded={handleJourneyEnded}
          />
        </section>
      )}

      {/* If No Active Journey, Show Start Journey Prompt */}
      {!activeJourney && !loading && (
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
            <Route className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Journey Currently Active</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Plan your travel using real road alternatives and Safety Pulse intelligence, or start quick GPS tracking.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => openPlanJourney('planner')}
              className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-sm inline-flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30"
            >
              <Route className="w-4 h-4" />
              Plan a Safe Route
            </button>
            <button
              type="button"
              onClick={() => openPlanJourney('quick')}
              className="w-full sm:w-auto py-3 px-5 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm inline-flex items-center justify-center gap-2 transition"
            >
              <Navigation className="w-4 h-4" />
              Quick Start Commute
            </button>
          </div>
        </div>
      )}

      {/* Previous Journeys (History) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Journey History ({historyJourneys.filter((j) => j.status === 'COMPLETED').length})
          </h2>
        </div>

        <JourneyHistoryList
          journeys={historyJourneys.filter((j) => j.status === 'COMPLETED')}
          loading={loading}
        />
      </section>

      {/* Setup Modal */}
      <JourneySetupModal
        isOpen={isSetupOpen}
        initialMode={setupMode}
        onClose={() => setIsSetupOpen(false)}
        onJourneyStarted={handleJourneyStarted}
      />

      {/* Completion Summary Modal */}
      <JourneySummaryModal
        summary={completedSummary}
        onClose={() => setCompletedSummary(null)}
      />
    </div>
  );
};

export default JourneyPage;
