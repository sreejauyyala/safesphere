import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Route,
  Compass,
  Star,
  MessageSquare,
  ShieldCheck,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { JourneySummary } from '../../types';
import communityFeedbackService from '../../services/communityFeedbackService';

interface JourneySummaryModalProps {
  summary: JourneySummary | null;
  onClose: () => void;
}

export const JourneySummaryModal: React.FC<JourneySummaryModalProps> = ({ summary, onClose }) => {
  const [showFeedback, setShowFeedback] = useState<boolean>(true);
  const [rating, setRating] = useState<number>(5);
  const [routeAccuracy, setRouteAccuracy] = useState<string>('MOSTLY_YES');
  const [safetyInfoUsefulness, setSafetyInfoUsefulness] = useState<string>('USEFUL');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!summary) return null;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.id) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await communityFeedbackService.submitJourneyFeedback(summary.id, {
        rating,
        route_accuracy: routeAccuracy as any,
        safety_info_usefulness: safetyInfoUsefulness as any,
        comment: comment.trim() || undefined,
      });
      setSubmittedFeedback(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit feedback. You can still close.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center my-6 max-h-[92vh] overflow-y-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">Journey Completed ✓</h3>
        <p className="text-slate-400 text-xs mb-4">
          Destination reached safely: <span className="text-slate-200 font-semibold">{summary.destination_name}</span>
        </p>

        {/* Journey statistics */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 mb-4">
          <div className="flex flex-col items-center">
            <Clock className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Duration</span>
            <span className="text-sm font-bold text-white">
              {summary.duration_minutes} <span className="text-xs text-slate-400 font-normal">min</span>
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-800/60">
            <Route className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Distance</span>
            <span className="text-sm font-bold text-white">
              {summary.distance_travelled.toFixed(2)} <span className="text-xs text-slate-400 font-normal">km</span>
            </span>
          </div>

          <div className="flex flex-col items-center">
            <Compass className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Points</span>
            <span className="text-sm font-bold text-white">
              {summary.points_recorded}
            </span>
          </div>
        </div>

        {/* Journey Feedback Section */}
        {submittedFeedback ? (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs mb-4 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Thank you! Your journey experience and safety ratings were saved.</span>
          </div>
        ) : (
          <div className="mb-4 text-left border border-slate-800 bg-slate-950/60 rounded-2xl p-4">
            <button
              type="button"
              onClick={() => setShowFeedback(!showFeedback)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-200"
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                How was your SafeSphere journey?
              </span>
              {showFeedback ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showFeedback && (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3.5 pt-3 animate-in fade-in">
                {error && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                    {error}
                  </div>
                )}

                {/* 1. Star Rating */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    1. Overall Journey Experience
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-[11px] text-slate-400 ml-2">
                      {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : 'Poor'}
                    </span>
                  </div>
                </div>

                {/* 2. Route Accuracy */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    2. Did the real route match the displayed guidance?
                  </label>
                  <select
                    value={routeAccuracy}
                    onChange={(e) => setRouteAccuracy(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="MOSTLY_YES">Mostly yes</option>
                    <option value="PARTLY">Partly</option>
                    <option value="NO">No</option>
                    <option value="UNABLE_TO_JUDGE">Unable to judge</option>
                  </select>
                </div>

                {/* 3. Safety Info Usefulness */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    3. Was the route safety information helpful for your decision?
                  </label>
                  <select
                    value={safetyInfoUsefulness}
                    onChange={(e) => setSafetyInfoUsefulness(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="USEFUL">Useful</option>
                    <option value="PARTLY_USEFUL">Partly useful</option>
                    <option value="NOT_USEFUL">Not useful</option>
                    <option value="INSUFFICIENT_DATA">Insufficient data</option>
                  </select>
                </div>

                {/* 4. Optional Comment */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    4. Optional Comment
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience (e.g. good street lighting, clear sidewalks)..."
                    rows={2}
                    maxLength={400}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none resize-none"
                  />
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  SafeSphere quality calibration. A positive experience rating does not guarantee an area is safe for all persons.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : 'Submit Journey Feedback'}
                </button>
              </form>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] text-xs"
        >
          {submittedFeedback ? 'Done' : 'Done / Skip Feedback'}
        </button>
      </div>
    </div>
  );
};

export default JourneySummaryModal;
