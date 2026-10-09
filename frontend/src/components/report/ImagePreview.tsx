import React from 'react';
import {
  RotateCcw,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';

interface ImagePreviewProps {
  imageFile: File;
  previewUrl: string;
  description: string;
  onChangeDescription: (val: string) => void;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  onAnalyzeImage: () => void;
  isAnalyzing?: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageFile,
  previewUrl,
  description,
  onChangeDescription,
  onReplaceImage,
  onRemoveImage,
  onAnalyzeImage,
  isAnalyzing = false,
}) => {
  const sizeMb = (imageFile.size / (1024 * 1024)).toFixed(2);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Safety Evidence Photo</h3>
            <p className="text-[11px] text-slate-400">
              {imageFile.name} &bull; {sizeMb} MB &bull; {imageFile.type.replace('image/', '').toUpperCase()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReplaceImage}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Choose a different image"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Replace</span>
          </button>
          <button
            type="button"
            onClick={onRemoveImage}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Remove image"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>
      </div>

      {/* Visual Image Preview */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-[340px] flex items-center justify-center group">
        <img
          src={previewUrl}
          alt="Safety Observation Evidence"
          className="max-h-[340px] w-auto max-w-full object-contain rounded-2xl"
        />
      </div>

      {/* Optional Accompanying Description (Image + Text combination) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Accompanying Description (Optional)</span>
        </label>
        <p className="text-[11px] text-slate-400">
          Describe what you observed (e.g. "Streetlight near the bus stop has been off for two days").
          Gemini AI combines both visual evidence and your observation.
        </p>
        <textarea
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          rows={3}
          disabled={isAnalyzing}
          placeholder="e.g. Pedestrian path is obstructed by construction materials..."
          className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none font-medium leading-relaxed"
        />
      </div>

      {/* Bottom Analyze Button */}
      <div className="pt-2 flex items-center justify-end border-t border-slate-800">
        <button
          type="button"
          disabled={isAnalyzing}
          onClick={onAnalyzeImage}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>
            {description.trim() ? 'Analyze Photo + Description with AI' : 'Analyze Photo with SafeSphere AI'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ImagePreview;
