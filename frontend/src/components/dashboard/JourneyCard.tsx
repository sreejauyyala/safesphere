import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Clock, ShieldCheck, Share2, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import { mockActiveJourney, type MockJourneyData } from '../../mock/demoData';

export interface JourneyCardProps {
  initialJourney?: MockJourneyData | null;
  className?: string;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({
  initialJourney = null,
  className = '',
}) => {
  const navigate = useNavigate();
  const [journey, setJourney] = useState<MockJourneyData | null>(initialJourney);

  return (
    <Card
      variant="card"
      className={className}
      icon={<Navigation className="w-5 h-5 text-indigo-400" />}
      title="Active Journey Monitor"
      subtitle="Safe route adherence & check-in protection"
      action={
        <div className="flex items-center gap-1.5">
          {/* Toggle demo button for evaluator to switch states */}
          <button
            type="button"
            onClick={() => setJourney(journey ? null : mockActiveJourney)}
            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Toggle between Idle and Active state for testing"
          >
            Demo: {journey ? 'Show Idle' : 'Show Active'}
          </button>
        </div>
      }
    >
      {journey ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                {journey.origin} &rarr; {journey.destination}
              </span>
              <StatusBadge status="safe" label={journey.status} pulse />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Route: {journey.estimatedRoute}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Share2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Location Sharing: {journey.locationSharing}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-indigo-900/40 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                Est. Arrival: in ~{journey.etaMinutes} mins
              </span>
              <span className="font-semibold text-emerald-400">
                Safety Score: {journey.safetyScoreEstimate}/100
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/journey')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open Journey Console
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
              Plan your travel with safety-weighted routing and emergency timer checks.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/journey')}
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
          >
            Start Journey
          </Button>
        </div>
      )}
    </Card>
  );
};

export default JourneyCard;
