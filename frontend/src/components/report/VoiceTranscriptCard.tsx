import React, { useState } from 'react';
import {
  Mic,
  Edit3,
  Check,
  Sparkles,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface VoiceTranscriptCardProps {
  transcript: string;
  onUpdateTranscript: (newTranscript: string) => void;
  onAnalyzeTranscript: (transcript: string) => void;
  onRecordAgain: () => void;
  isAnalyzing?: boolean;
  unclearSpeech?: boolean;
}

export const VoiceTranscriptCard: React.FC<VoiceTranscriptCardProps> = ({
  transcript,
  onUpdateTranscript,
  onAnalyzeTranscript,
  onRecordAgain,
  isAnalyzing = false,
  unclearSpeech = false,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>(transcript);

  const handleSaveEdit = () => {
    onUpdateTranscript(editedText.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(transcript);
    setIsEditing(false);
  };

  if (unclearSpeech) {
    return (
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 space-y-4 shadow-xl text-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-100">
              SafeSphere could not confidently understand the recording
            </h3>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              The speech in your audio recording was quiet or unclear. You can record again closer to the microphone or enter the details manually.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-500/20">
          <button
            type="button"
            onClick={onRecordAgain}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Record Again</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setEditedText('');
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Enter Text Manually</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-purple-950/20 border border-purple-500/30 p-5 space-y-4 shadow-xl animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Voice Transcript</h3>
            <p className="text-[11px] text-purple-300/80">
              Generated from spoken audio &bull; Editable for accuracy
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setEditedText(transcript);
              setIsEditing(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-400" />
            <span>Edit Transcript</span>
          </button>
        )}
      </div>

      {/* Transcript Body: Read mode or Edit mode */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={4}
            className="w-full rounded-xl bg-slate-950 border border-purple-500/40 p-3.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-medium leading-relaxed"
            placeholder="Edit or enter the observation text..."
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 leading-relaxed italic">
            "{transcript}"
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Verify words before classification. Tap "Edit Transcript" if any names or terms were misheard.</span>
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-purple-500/20">
        <button
          type="button"
          onClick={onRecordAgain}
          disabled={isAnalyzing}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Record Again</span>
        </button>

        <button
          type="button"
          disabled={isAnalyzing || !transcript.trim()}
          onClick={() => onAnalyzeTranscript(transcript)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-purple-200" />
          <span>Analyze Transcript with SafeSphere AI</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceTranscriptCard;
