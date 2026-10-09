import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  RotateCcw,
  Play,
  Pause,
  AlertCircle,
  Sparkles,
  FileText,
  Volume2,
} from 'lucide-react';


interface VoiceReportRecorderProps {
  onAudioReady: (blob: Blob, durationSeconds: number) => void;
  onAnalyzeAudio?: (blob: Blob) => void;
  onTranscribeOnly?: (blob: Blob) => void;
  isProcessing?: boolean;
}

export const VoiceReportRecorder: React.FC<VoiceReportRecorderProps> = ({
  onAudioReady,
  onAnalyzeAudio,
  onTranscribeOnly,
  isProcessing = false,
}) => {
  // Recorder states: 'idle' | 'recording' | 'recorded'
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Maximum allowed recording duration
  const MAX_RECORDING_SECONDS = 60;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Recording Timer
  useEffect(() => {
    if (recorderState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            // Auto stop when reaching max hackathon limit
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recorderState]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Detect supported browser MIME types
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'audio/webm';
  };

  // Start Voice Recording
  const startRecording = async () => {
    setErrorMessage(null);
    setIsPermissionDenied(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Audio recording is not supported on this browser. You can enter your report manually.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (finalBlob.size > 10 * 1024 * 1024) {
          setErrorMessage('Audio recording is too large (exceeds 10MB). Please record a shorter message.');
          setRecorderState('idle');
          return;
        }

        const url = URL.createObjectURL(finalBlob);
        setAudioBlob(finalBlob);
        setAudioUrl(url);
        setRecorderState('recorded');
        onAudioReady(finalBlob, recordingSeconds);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice data every 250ms
      setRecordingSeconds(0);
      setRecorderState('recording');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setErrorMessage('Microphone access is required to record a voice report.');
      } else {
        setErrorMessage('Unable to access microphone. Please check system permissions or use manual reporting.');
      }
      setRecorderState('idle');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Cancel Recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setRecordingSeconds(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecorderState('idle');
  };

  // Audio Playback Toggle
  const togglePlayAudio = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Voice Safety Observation</h3>
            <p className="text-xs text-slate-400">
              Speak naturally about what you observed. SafeSphere auto-detects multiple languages.
            </p>
          </div>
        </div>

        {recorderState === 'recording' && (
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Recording ({formatTime(recordingSeconds)})</span>
          </span>
        )}
      </div>

      {/* Permission Denied / Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">{errorMessage}</p>
            {isPermissionDenied && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                >
                  Try Again
                </button>
                <span className="text-slate-400 text-[11px]">Or switch to Text Report anytime.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATE 1: IDLE / READY TO RECORD */}
      {recorderState === 'idle' && (
        <div className="text-center py-6 space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-purple-500/10 border-2 border-dashed border-purple-500/40 flex items-center justify-center text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer group"
            onClick={startRecording}
          >
            <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-200">Tap to Start Recording</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Describe the safety concern, location, or broken infrastructure clearly (up to 60 seconds).
            </p>
          </div>

          <button
            type="button"
            onClick={startRecording}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            <span>Start Voice Recording</span>
          </button>
        </div>
      )}

      {/* STATE 2: ACTIVE RECORDING */}
      {recorderState === 'recording' && (
        <div className="text-center py-6 space-y-4">
          {/* Animated pulsing wave visual */}
          <div className="flex items-center justify-center gap-1.5 h-16">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce delay-100" />
            <div className="w-1.5 h-10 bg-rose-500 rounded-full animate-bounce delay-200" />
            <div className="w-1.5 h-14 bg-rose-500 rounded-full animate-bounce delay-300" />
            <div className="w-1.5 h-8 bg-rose-500 rounded-full animate-bounce delay-150" />
            <div className="w-1.5 h-12 bg-rose-500 rounded-full animate-bounce delay-250" />
          </div>

          <div className="space-y-1">
            <span className="text-2xl font-mono font-bold text-slate-100">
              {formatTime(recordingSeconds)}
            </span>
            <span className="text-xs text-slate-500 block">
              Max duration: 01:00
            </span>
            <p className="text-xs text-purple-300">
              Speak clearly: "Streetlight near the bus stop has not worked for two days..."
            </p>
          </div>

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop Recording</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: RECORDING COMPLETED / AUDIO REVIEW */}
      {recorderState === 'recorded' && audioBlob && audioUrl && (
        <div className="space-y-4">
          {/* Playback Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition active:scale-95 shadow-md shadow-purple-600/30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Recording Completed ({formatTime(recordingSeconds)})
                </span>
                <span className="text-[11px] text-slate-400">
                  Ready for transcription &amp; Gemini AI classification
                </span>
              </div>
            </div>

            <audio
              ref={audioElementRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
              <Volume2 className="w-4 h-4" />
              <span>{(audioBlob.size / 1024).toFixed(0)} KB</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={cancelRecording}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Record Again</span>
            </button>

            <div className="flex items-center gap-2">
              {onTranscribeOnly && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onTranscribeOnly(audioBlob)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Transcribe First</span>
                </button>
              )}

              {onAnalyzeAudio && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onAnalyzeAudio(audioBlob)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Voice with AI</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceReportRecorder;
