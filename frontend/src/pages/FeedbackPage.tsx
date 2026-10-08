import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Star, Send, CheckCircle2, ThumbsUp } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState('Route Safety');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
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
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-emerald-400" />
          Community Safety Feedback
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Share your experience to improve municipal lighting, route algorithms, and community patrol coordination.
        </p>
      </div>

      {isSubmitted ? (
        <Card variant="panel" glow="emerald" className="text-center p-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Feedback Submitted</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Thank you for helping keep your community secure. Your rating and remarks contribute directly to local SafeSphere safety index calibration.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => navigate('/home')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="panel" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Star Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Overall Safety Comfort Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-2 font-medium">
                  {rating === 5 ? 'Very Safe & Reassuring' : rating === 4 ? 'Good' : rating === 3 ? 'Moderate' : 'Uncomfortable'}
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Feedback Focus
              </label>
              <select
                value={feedbackCategory}
                onChange={(e) => setFeedbackCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="Route Safety">Route Lighting & Visibility</option>
                <option value="Haven Access">Help Point / Haven Accessibility</option>
                <option value="Patrol Presence">Campus / Community Patrol Presence</option>
                <option value="General Safety">General Neighborhood Experience</option>
              </select>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Observations & Constructive Feedback
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe lighting conditions, road maintenance, or areas where you felt more or less safe..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Step 3 Notice */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <ThumbsUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Safety feedback submissions will persist to municipal dashboard and Gemini AI sentiment scoring in Step 6+.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Send className="w-4 h-4" />}
              className="w-full"
            >
              Submit Safety Feedback
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};

export default FeedbackPage;
