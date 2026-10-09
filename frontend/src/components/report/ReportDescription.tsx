import React from 'react';
import { ShieldAlert, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface ReportDescriptionProps {
  title: string;
  onChangeTitle: (title: string) => void;
  description: string;
  onChangeDescription: (description: string) => void;
  error?: string | null;
  onAnalyzeAI?: () => void;
  isAnalyzing?: boolean;
  canAnalyzeAI?: boolean;
  cooldownSeconds?: number;
  aiError?: string | null;
}

export const ReportDescription: React.FC<ReportDescriptionProps> = ({
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  error,
  onAnalyzeAI,
  isAnalyzing = false,
  canAnalyzeAI = true,
  cooldownSeconds = 0,
  aiError = null,
}) => {
  const maxLength = 1000;
  const charCount = description.length;
  const isEligibleForAI = description.trim().length >= 5 && !isAnalyzing && cooldownSeconds === 0;

  return (
    <div className="space-y-4">
      {/* Optional Title */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-1">
          Headline / Summary <span className="text-xs font-normal text-slate-400">(Optional)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          maxLength={150}
          placeholder="e.g. Non-working streetlights near Bus Stop 4"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
        />
      </div>

      {/* Description Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-slate-200">
            Observation Details <span className="text-rose-400">*</span>
          </label>
          <span
            className={`text-xs ${
              charCount > maxLength * 0.9
                ? 'text-rose-400'
                : charCount >= 5
                ? 'text-slate-400'
                : 'text-amber-400'
            }`}
          >
            {charCount}/{maxLength} (min 5 chars)
          </span>
        </div>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          maxLength={maxLength}
          placeholder="Describe what you observed clearly (e.g. Streetlight has been out for several days, path is completely dark after 8 PM)..."
          className={`w-full p-3.5 rounded-xl bg-slate-900 border text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors resize-y min-h-[110px] ${
            error
              ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
          }`}
        />
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      </div>

      {/* Prominent Gemini AI Analysis Trigger */}
      {onAnalyzeAI && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-purple-200">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>SafeSphere AI:</strong> Let Gemini suggest category, severity, and safety signal.
            </span>
          </div>

          <button
            type="button"
            onClick={onAnalyzeAI}
            disabled={!isEligibleForAI || !canAnalyzeAI}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${
              isEligibleForAI && canAnalyzeAI
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                <span>Analyzing your report...</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Wait {cooldownSeconds}s</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>✨ Analyze with SafeSphere AI</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Graceful AI Error / Fallback Banner */}
      {aiError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block">AI analysis unavailable</span>
            <span className="text-[11px] text-amber-300/90">{aiError}</span>
          </div>
        </div>
      )}

      {/* Responsible Reporting Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-cyan-500/20 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-cyan-300">Responsible Community Reporting:</span>{' '}
          Only report observations or environmental concerns that you genuinely experienced. Please avoid accusing specific individuals, publishing personal identities, or making unsupported allegations.
        </div>
      </div>
    </div>
  );
};

export default ReportDescription;
