import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Plus, ArrowLeft, RefreshCw, Route } from 'lucide-react';
import type { Journey, JourneySummary } from '../types';
import apiService from '../services/api';
import { useLocation } from '../contexts/LocationContext';
import ActiveJourneyCard from '../components/journey/ActiveJourneyCard';
import JourneySetupModal from '../components/journey/JourneySetupModal';
import JourneySummaryModal from '../components/journey/JourneySummaryModal';
import JourneyHistoryList from '../components/journey/JourneyHistoryList';

export const JourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const { startLocationTracking, stopLocationTracking } = useLocation();

  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [historyJourneys, setHistoryJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<JourneySummary | null>(null);

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
      } else {
        setActiveJourney(null);
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
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Start New Journey
            </button>
          )}
        </div>
      </div>

      {/* Active Journey Section */}
      {activeJourney && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Journey
          </h2>
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
              Start a monitored journey to log GPS breadcrumbs, track elapsed travel time, and save your route history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSetupOpen(true)}
            className="py-3 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white text-sm inline-flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
          >
            <Navigation className="w-4 h-4" />
            Start Journey Now
          </button>
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
