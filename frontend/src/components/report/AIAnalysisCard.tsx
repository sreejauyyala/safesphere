import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Edit3,
  AlertCircle,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { AIAnalysisResult } from '../../types';
import { CATEGORIES } from './ReportCategorySelector';

export interface AIAnalysisCardProps {
  analysis: AIAnalysisResult;
  onAccept: (analysis: AIAnalysisResult) => void;
  onEditManually: () => void;
  isAccepted?: boolean;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  analysis,
  onAccept,
  onEditManually,
  isAccepted = false,
}) => {
  const categoryMeta = CATEGORIES.find((c) => c.id === analysis.category) || {
    id: analysis.category,
    name: analysis.category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: '📍',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const confidencePct = Math.round(analysis.confidence * 100);
  const isHighConfidence = confidencePct >= 90;
  const isModerateConfidence = confidencePct >= 70 && confidencePct < 90;
  const isLowConfidence = confidencePct < 70;

  const severityUpper = analysis.severity.toUpperCase();
  const severityBadgeClass =
    severityUpper === 'HIGH'
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      : severityUpper === 'MEDIUM'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-purple-950/20 border border-purple-500/30 p-5 shadow-2xl backdrop-blur-md space-y-4 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              SafeSphere AI Analysis
            </h3>
            <p className="text-[11px] text-purple-300/80">
              AI Suggestion &bull; Not a confirmed problem until you submit
            </p>
          </div>
        </div>

        {isAccepted && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted</span>
          </span>
        )}
      </div>

      {/* Suggested Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Suggested Category */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Suggested Category
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg">{categoryMeta.icon}</span>
            <span className="text-sm font-bold text-slate-100">{categoryMeta.name}</span>
          </div>
        </div>

        {/* Suggested Severity */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Suggested Severity
          </span>
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${severityBadgeClass}`}
            >
              {analysis.severity}
            </span>
          </div>
        </div>

        {/* Safety Signal */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-cyan-400" />
            Safety Signal
          </span>
          <p className="text-xs font-mono text-cyan-300 font-medium">
            {analysis.safety_signal || analysis.category}
          </p>
        </div>

        {/* AI Confidence */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              AI Classification Confidence
            </span>
            <span className="text-xs font-bold text-slate-200">{confidencePct}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isHighConfidence
                  ? 'bg-emerald-400'
                  : isModerateConfidence
                  ? 'bg-cyan-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(5, confidencePct)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {isHighConfidence && 'High confidence in taxonomy match.'}
            {isModerateConfidence && 'Moderate confidence in classification.'}
            {isLowConfidence && 'Low confidence — please verify carefully.'}
          </p>
        </div>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Incident Summary
          </span>
          <p className="text-slate-200 leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Low Confidence Warning Notice */}
      {isLowConfidence && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">AI is not confident about this classification.</span>
            <span className="text-[11px] text-amber-300/80">
              The model suggests selecting the category and severity manually to ensure accuracy.
            </span>
          </div>
        </div>
      )}

      {/* Suggested Workflow Action */}
      {analysis.suggested_action && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
          <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>Suggested Action: {analysis.suggested_action}</span>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-purple-500/20">
        <button
          type="button"
          onClick={onEditManually}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
          <span>{isLowConfidence ? 'Choose Category Manually' : 'Edit Manually'}</span>
        </button>

        <button
          type="button"
          onClick={() => onAccept(analysis)}
          className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
            isAccepted
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isAccepted ? 'Suggestions Applied' : 'Accept Suggestions'}</span>
        </button>
      </div>
    </div>
  );
};

export default AIAnalysisCard;
