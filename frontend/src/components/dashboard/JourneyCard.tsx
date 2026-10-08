import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Clock, ShieldCheck, Route, ArrowRight, Play } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import apiService from '../../services/api';
import type { Journey } from '../../types';
import JourneySetupModal from '../journey/JourneySetupModal';

export interface JourneyCardProps {
  className?: string;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiService
      .getActiveJourney()
      .then((data) => {
        if (isMounted) setActiveJourney(data);
      })
      .catch(() => {
        if (isMounted) setActiveJourney(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const calculateElapsedMinutes = (startedAt: string) => {
    try {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch {
      return 0;
    }
  };

  return (
    <>
      <Card
        variant="card"
        className={className}
        icon={<Navigation className="w-5 h-5 text-indigo-400" />}
        title="Active Journey Monitor"
        subtitle="Live GPS breadcrumbs & travel tracking"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/journey')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Journey Console
          </Button>
        }
      >
        {loading ? (
          <div className="h-32 rounded-2xl bg-slate-900/60 animate-pulse" />
        ) : activeJourney ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeJourney.status === 'ACTIVE'
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>Trip to: </span>
                  <span className="text-white font-extrabold">{activeJourney.destination_name}</span>
                </span>
                <StatusBadge
                  status={activeJourney.status === 'ACTIVE' ? 'safe' : 'caution'}
                  label={activeJourney.status === 'ACTIVE' ? 'Tracking Active' : 'Tracking Paused'}
                  pulse={activeJourney.status === 'ACTIVE'}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Elapsed: {calculateElapsedMinutes(activeJourney.started_at)} mins</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Route className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Distance: {activeJourney.distance_travelled.toFixed(2)} km</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-indigo-900/40 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  GPS Breadcrumb Logging
                </span>
                <span className="font-semibold text-emerald-400">
                  Status: {activeJourney.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/journey')}
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
              >
                Manage Active Journey
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-slate-500 mx-auto flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-300">No active journey</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Start a journey to track your GPS movement and store your path.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSetupModalOpen(true)}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Start Safe Journey
            </Button>
          </div>
        )}
      </Card>

      <JourneySetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onJourneyStarted={(j) => setActiveJourney(j)}
      />
    </>
  );
};

export default JourneyCard;
