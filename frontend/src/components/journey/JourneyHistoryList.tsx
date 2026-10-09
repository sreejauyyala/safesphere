import React, { useState } from 'react';
import { Route, Clock, Calendar, ChevronRight, CheckCircle2, XCircle, Eye } from 'lucide-react';
import type { Journey, JourneyLocationPoint } from '../../types';
import apiService from '../../services/api';
import SafeSphereMap from '../map/SafeSphereMap';

interface JourneyHistoryListProps {
  journeys: Journey[];
  loading?: boolean;
}

export const JourneyHistoryList: React.FC<JourneyHistoryListProps> = ({
  journeys,
  loading = false,
}) => {
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [routePoints, setRoutePoints] = useState<JourneyLocationPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const handleSelectJourney = async (journey: Journey) => {
    setSelectedJourney(journey);
    setLoadingPoints(true);
    try {
      const points = await apiService.getJourneyLocationPoints(journey.id);
      setRoutePoints(points);
    } catch (err) {
      console.error('Failed to load journey points:', err);
      setRoutePoints([]);
    } finally {
      setLoadingPoints(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const calculateDurationMinutes = (startStr: string, endStr?: string | null) => {
    if (!endStr) return null;
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    return Math.max(1, Math.round((end - start) / 60000));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (journeys.length === 0) {
    return (
      <div className="text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800 p-6">
        <Route className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">No Journey History Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Start your first SafeSphere journey to track routes and keep a record of completed travels.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {journeys.map((j) => {
          const duration = calculateDurationMinutes(j.started_at, j.ended_at);
          const isCompleted = j.status === 'COMPLETED';

          return (
            <div
              key={j.id}
              onClick={() => handleSelectJourney(j)}
              className="group p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition truncate">
                    {j.destination_name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDate(j.started_at)}
                    </span>
                    {duration !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {duration} min
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium text-emerald-400">
                      <Route className="w-3 h-3" />
                      {j.distance_travelled.toFixed(1)} km
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border hidden sm:inline-block ${
                    isCompleted
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {j.status}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition group-hover:translate-x-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Journey Details Modal */}
      {selectedJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">
                  Journey Details
                </span>
                <h3 className="text-xl font-bold text-white">
                  {selectedJourney.title || 'Trip'} &rarr; {selectedJourney.destination_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJourney(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Started</span>
                <span className="font-semibold text-slate-200">
                  {formatTime(selectedJourney.started_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Ended</span>
                <span className="font-semibold text-slate-200">
                  {formatTime(selectedJourney.ended_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Duration</span>
                <span className="font-semibold text-white">
                  {calculateDurationMinutes(selectedJourney.started_at, selectedJourney.ended_at) || 'N/A'}{' '}
                  min
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Distance</span>
                <span className="font-semibold text-emerald-400">
                  {selectedJourney.distance_travelled.toFixed(2)} km
                </span>
              </div>
            </div>

            {/* Route Map */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  Recorded GPS Route Breadcrumbs ({routePoints.length} points)
                </span>
              </div>

              {loadingPoints ? (
                <div className="h-64 rounded-2xl bg-slate-950 flex items-center justify-center text-slate-500 text-xs">
                  Loading recorded path...
                </div>
              ) : (
                <SafeSphereMap
                  activeJourney={selectedJourney}
                  recordedJourneyPoints={routePoints}
                  center={[selectedJourney.start_latitude, selectedJourney.start_longitude]}
                  zoom={14}
                  className="h-64 w-full rounded-2xl"
                  showUserLocation={false}
                  showReports={false}
                  showHelpPoints={false}
                  showHotspots={false}
                />
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedJourney(null)}
                className="py-2.5 px-5 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-white transition text-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JourneyHistoryList;
