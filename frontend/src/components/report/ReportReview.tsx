import React from 'react';
import { Send, Edit3, MapPin, RefreshCw, Sparkles, Mic, Camera, FileText } from 'lucide-react';
import { CATEGORIES } from './ReportCategorySelector';
import { SEVERITIES } from './ReportSeveritySelector';
import SafeSphereMap from '../map/SafeSphereMap';

interface ReportReviewProps {
  category: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  latitude: number;
  longitude: number;
  locationLabel: string;
  isSubmitting: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  isAIAssisted?: boolean;
  modality?: 'text' | 'voice' | 'image';
  transcript?: string;
  imagePreviewUrl?: string;
}

export const ReportReview: React.FC<ReportReviewProps> = ({
  category,
  title,
  description,
  severity,
  latitude,
  longitude,
  locationLabel,
  isSubmitting,
  onEdit,
  onSubmit,
  isAIAssisted = false,
  modality = 'text',
  transcript,
  imagePreviewUrl,
}) => {
  const catObj = CATEGORIES.find((c) => c.id === category) || {
    id: category,
    name: 'Safety Concern',
    icon: '⚠️',
  };

  const sevObj = SEVERITIES.find((s) => s.level === severity) || {
    level: severity,
    name: severity,
    colorClass: 'text-amber-400',
    activeBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/30',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-bold text-slate-100">Review Your Safety Report</h2>
          <p className="text-xs text-slate-400 mt-1">
            Please confirm your observation details before broadcasting to the SafeSphere community network.
          </p>
        </div>

        <div className="flex items-center gap-2 self-center sm:self-auto flex-wrap">
          {/* Modality Badge */}
          {modality === 'voice' && (
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Report</span>
            </span>
          )}
          {modality === 'image' && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Photo Evidence Report</span>
            </span>
          )}
          {modality === 'text' && (
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Text Report</span>
            </span>
          )}

          {isAIAssisted && (
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI-Assisted &bull; User Confirmed</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Review Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
        {/* Category & Severity Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
              {catObj.icon}
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                Category
              </span>
              <span className="text-base font-bold text-slate-100">{catObj.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Severity:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${sevObj.activeBg} ${sevObj.activeBorder} ${sevObj.colorClass}`}
            >
              {sevObj.name}
            </span>
          </div>
        </div>

        {/* Title / Description */}
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Factual Observation
          </span>
          {title && <h4 className="text-sm font-semibold text-slate-200 mb-1">{title}</h4>}
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            "{description}"
          </p>
        </div>

        {/* Voice Transcript Section (if voice modality) */}
        {transcript && (
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Recording Transcript</span>
            </span>
            <p className="text-xs text-slate-200 italic">"{transcript}"</p>
          </div>
        )}

        {/* Photo Evidence Thumbnail (if image modality) */}
        {imagePreviewUrl && (
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Attached Photo Evidence</span>
            </span>
            <div className="w-full max-h-[220px] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={imagePreviewUrl}
                alt="Evidence"
                className="max-h-[220px] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Location Display */}
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Location
          </span>
          <div className="flex items-start gap-2 text-sm text-slate-200 mb-3">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100">{locationLabel}</span>
              <span className="text-xs text-slate-500 font-mono block mt-0.5">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </div>
          </div>

          {/* Mini Map Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-800">
            <SafeSphereMap
              center={[latitude, longitude]}
              zoom={15}
              customMarker={{
                latitude,
                longitude,
                label: locationLabel,
                icon: catObj.icon,
              }}
              className="h-[180px] w-full"
              showReports={false}
              showHelpPoints={false}
              showHotspots={false}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Edit Report
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Submitting Report...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReportReview;
