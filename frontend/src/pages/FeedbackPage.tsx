import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  ArrowLeft,
  Star,
  Send,
  CheckCircle2,
  History,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  MapPin,
  Route,
  Activity,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import communityFeedbackService from '../services/communityFeedbackService';
import type { CommunityFeedback } from '../types';

const FEEDBACK_CATEGORIES = [
  { id: 'app_experience', label: 'App experience', icon: Sparkles, requiresRating: true },
  { id: 'reporting_experience', label: 'Reporting experience', icon: MessageSquare, requiresRating: true },
  { id: 'map_accuracy', label: 'Map accuracy', icon: MapPin, requiresRating: true },
  { id: 'safety_pulse_usefulness', label: 'Safety Pulse usefulness', icon: Activity, requiresRating: true },
  { id: 'route_guidance_usefulness', label: 'Route guidance usefulness', icon: Route, requiresRating: true },
  { id: 'accessibility_concerns', label: 'Accessibility concerns', icon: ShieldCheck, requiresRating: false },
  { id: 'technical_problems', label: 'Technical problems', icon: MessageSquare, requiresRating: false },
  { id: 'feature_suggestions', label: 'Feature suggestions', icon: Sparkles, requiresRating: false },
  { id: 'other_feedback', label: 'Other feedback', icon: MessageSquare, requiresRating: false },
];

export const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [category, setCategory] = useState<string>('app_experience');
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<CommunityFeedback[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const currentCategoryConfig = FEEDBACK_CATEGORIES.find((c) => c.id === category) || FEEDBACK_CATEGORIES[0];

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const items = await communityFeedbackService.getMyFeedbackHistory(50);
      setHistoryItems(items);
    } catch {
      // Soft fail
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMessage('Please provide a brief description or feedback note.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await communityFeedbackService.submitGeneralFeedback({
        category,
        rating: rating || undefined,
        comment: comment.trim(),
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setComment('');
    setRating(5);
    setCategory('app_experience');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home Dashboard</span>
        </button>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'submit'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Submit Feedback
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'history'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            My Feedback History
          </button>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
          Community Safety Feedback
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Share your observations to improve safety information accuracy, route guidance, and municipal hazard tracking.
        </p>
      </div>

      {activeTab === 'submit' ? (
        isSubmitted ? (
          <Card variant="panel" glow="emerald" className="text-center p-8 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Feedback Submitted Successfully</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Thank you for contributing to community intelligence. Your response has been securely saved and contributes to continuous SafeSphere calibration.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleResetForm}>
                Submit Another Feedback
              </Button>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('history')}>
                View My History
              </Button>
            </div>
          </Card>
        ) : (
          <Card variant="panel" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Feedback Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Feedback Focus Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setCategory(cat.id);
                          if (!cat.requiresRating) {
                            setRating(null);
                          } else if (rating === null) {
                            setRating(5);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 ring-1 ring-cyan-500/30'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-200">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating (where relevant) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Rating {currentCategoryConfig.requiresRating ? '' : '(Optional)'}
                  </label>
                  {rating !== null && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="text-[11px] text-slate-500 hover:text-slate-300"
                    >
                      Clear rating
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          rating !== null && star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 ml-2 font-medium">
                    {rating === null
                      ? 'No rating selected'
                      : rating === 5
                      ? 'Excellent / Reassuring'
                      : rating === 4
                      ? 'Good'
                      : rating === 3
                      ? 'Moderate'
                      : 'Needs Improvement'}
                  </span>
                </div>
              </div>

              {/* Description / comment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Comments & Observations <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe your observation, suggestion, or specific experience..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                  required
                />
                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                  <span>Help us keep SafeSphere accurate and safe for everyone</span>
                  <span>{comment.length}/1000</span>
                </div>
              </div>

              {/* Privacy protection banner */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Privacy Protected: Feedback is isolated and never publicly identifies your private phone or email.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
              </Button>
            </form>
          </Card>
        )
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200">Your Private Feedback Submissions</h2>
            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
              <p className="text-xs">Loading feedback history...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <Card variant="panel" className="text-center p-8 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No Feedback Submitted Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any observation votes, journey ratings, or app feedback you submit will appear here.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('submit')}>
                Submit Your First Feedback
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                        {item.target_type.replace(/_/g, ' ')}
                      </span>
                      <strong className="text-slate-100">
                        {item.concern_category || item.feedback_type.replace(/_/g, ' ')}
                      </strong>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {item.rating && (
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= item.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] text-slate-400 ml-1">({item.rating}/5)</span>
                    </div>
                  )}

                  {item.comment && (
                    <p className="text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-[11px] leading-relaxed">
                      {item.comment}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Status: {item.status}</span>
                    {item.route_accuracy && <span>Route: {item.route_accuracy}</span>}
                    {item.safety_info_usefulness && <span>Safety Info: {item.safety_info_usefulness}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
