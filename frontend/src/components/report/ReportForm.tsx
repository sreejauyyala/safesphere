import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  X,
  AlertOctagon,
} from 'lucide-react';
import type { ReportItem, AIAnalysisResult } from '../../types';
import reportService from '../../services/reportService';
import aiService from '../../services/aiService';
import ReportInputTabs, { type ReportModality } from './ReportInputTabs';
import VoiceReportRecorder from './VoiceReportRecorder';
import VoiceTranscriptCard from './VoiceTranscriptCard';
import ImageReportUploader from './ImageReportUploader';
import ImagePreview from './ImagePreview';
import ReportCategorySelector from './ReportCategorySelector';
import ReportSeveritySelector from './ReportSeveritySelector';
import ReportDescription from './ReportDescription';
import ReportLocationPicker from './ReportLocationPicker';
import ReportReview from './ReportReview';
import ReportSuccess from './ReportSuccess';
import AIAnalysisCard from './AIAnalysisCard';

export const ReportForm: React.FC = () => {
  const navigate = useNavigate();

  // Modality: 'text' | 'voice' | 'image'
  const [modality, setModality] = useState<ReportModality>('text');

  // Core Form Fields
  const [category, setCategory] = useState<string>('poor_lighting');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('');

  // Voice Modality State (Step 8)
  const [, setVoiceBlob] = useState<Blob | null>(null);

  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isTranscribingVoice, setIsTranscribingVoice] = useState<boolean>(false);
  const [unclearSpeechVoice, setUnclearSpeechVoice] = useState<boolean>(false);

  // Image Modality State (Step 8)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string>('');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);

  // Step Management: 1 = Details, 2 = Review, 3 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submittedReport, setSubmittedReport] = useState<ReportItem | null>(null);

  // Gemini AI Analysis State (Unified Step 7 + 8)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAIAccepted, setIsAIAccepted] = useState<boolean>(false);
  const [lastAnalyzedText, setLastAnalyzedText] = useState<string>('');
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Validation & Loading
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Duplicate Warning Modal
  const [duplicateData, setDuplicateData] = useState<{ message: string; existingId: string } | null>(null);

  // Unsaved Changes Leave Confirmation Modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);

  // Check if form has dirty unsaved user data
  const isDirty =
    description.trim().length > 0 ||
    locationLabel.length > 0 ||
    voiceTranscript.length > 0 ||
    imageFile !== null;

  // Rate Limiting Cooldown Timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  // Clean up object URLs on unmount or file replace
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleLeaveCheck = () => {
    if (isDirty && currentStep !== 3) {
      setShowLeaveConfirm(true);
    } else {
      navigate('/home');
    }
  };

  // ============================================================================
  // TEXT MODALITY HANDLERS (Step 7)
  // ============================================================================

  const handleAnalyzeTextWithAI = async () => {
    const trimmed = description.trim();
    if (trimmed.length < 5) {
      setErrors((prev) => ({
        ...prev,
        description: 'Please describe the observation (at least 5 characters required) before analyzing with AI.',
      }));
      return;
    }

    if (aiAnalysis && trimmed === lastAnalyzedText && cooldownSeconds > 0) {
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const resp = await aiService.analyzeReport(trimmed);
      if (resp.success && resp.analysis) {
        setAiAnalysis(resp.analysis);
        setLastAnalyzedText(trimmed);
        setIsAIAccepted(false);
        setCooldownSeconds(6);
      } else {
        setAiError(
          resp.message ||
            'AI analysis is temporarily unavailable. You can continue by selecting the category and severity manually.'
        );
      }
    } catch {
      setAiError(
        'AI analysis is temporarily unavailable. You can continue by selecting the category and severity manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ============================================================================
  // VOICE MODALITY HANDLERS (Step 8)
  // ============================================================================

  const handleVoiceAudioReady = (blob: Blob) => {
    setVoiceBlob(blob);
    setUnclearSpeechVoice(false);
  };

  // Transcribe audio first, allowing user to view and edit transcript before classification
  const handleTranscribeVoiceOnly = async (blob: Blob) => {
    setIsTranscribingVoice(true);
    setAiError(null);
    setUnclearSpeechVoice(false);

    try {
      const resp = await aiService.transcribeAudio(blob);
      if (resp.success && resp.transcript) {
        setVoiceTranscript(resp.transcript);
        setDescription(resp.transcript);
      } else if (resp.code === 'UNCLEAR_SPEECH') {
        setUnclearSpeechVoice(true);
      } else {
        setAiError(resp.message || 'Speech transcription unavailable. You can continue by typing the report manually.');
      }
    } catch {
      setAiError('Speech transcription unavailable. You can continue by typing the report manually.');
    } finally {
      setIsTranscribingVoice(false);
    }
  };

  // Analyze voice directly: Speech-to-text + Gemini Safety Classification
  const handleAnalyzeVoiceDirect = async (blob: Blob) => {
    setIsAnalyzing(true);
    setAiError(null);
    setUnclearSpeechVoice(false);

    try {
      const resp = await aiService.analyzeSafetyAudio(blob);
      if (resp.success && resp.analysis) {
        if (resp.transcript) {
          setVoiceTranscript(resp.transcript);
          setDescription(resp.transcript);
        }
        setAiAnalysis(resp.analysis);
        setIsAIAccepted(false);
      } else if (resp.code === 'UNCLEAR_SPEECH') {
        setUnclearSpeechVoice(true);
      } else {
        setAiError(
          resp.message ||
            'Voice safety analysis is unavailable. You can continue by selecting category and severity manually.'
        );
      }
    } catch {
      setAiError(
        'Voice safety analysis is unavailable. You can continue by selecting category and severity manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze transcript text once verified / edited by user
  const handleAnalyzeVoiceTranscript = async (transcriptText: string) => {
    if (!transcriptText.trim()) return;

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const resp = await aiService.analyzeReport(transcriptText);
      if (resp.success && resp.analysis) {
        setAiAnalysis(resp.analysis);
        setDescription(transcriptText);
        setIsAIAccepted(false);
      } else {
        setAiError(
          resp.message ||
            'AI analysis is temporarily unavailable. You can continue by selecting category and severity manually.'
        );
      }
    } catch {
      setAiError(
        'AI analysis is temporarily unavailable. You can continue by selecting category and severity manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVoiceRecordAgain = () => {
    setVoiceBlob(null);
    setVoiceTranscript('');
    setUnclearSpeechVoice(false);
    setAiAnalysis(null);
    setIsAIAccepted(false);
  };

  // ============================================================================
  // IMAGE MODALITY HANDLERS (Step 8)
  // ============================================================================

  const handleImageSelected = (file: File) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreviewUrl(url);
    setUploadedMediaUrl(null);
    setAiAnalysis(null);
    setIsAIAccepted(false);
    setAiError(null);
  };

  const handleReplaceImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setAiAnalysis(null);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setImageDescription('');
    setUploadedMediaUrl(null);
    setAiAnalysis(null);
  };

  const handleAnalyzeImageWithAI = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const resp = await aiService.analyzeSafetyImage(imageFile, imageDescription);
      if (resp.success && resp.analysis) {
        setAiAnalysis(resp.analysis);
        if (resp.media_url) {
          setUploadedMediaUrl(resp.media_url);
        }
        if (resp.analysis.summary && !description.trim()) {
          setDescription(
            imageDescription.trim()
              ? `${imageDescription.trim()} (${resp.analysis.summary})`
              : resp.analysis.summary
          );
        }
        setIsAIAccepted(false);
      } else {
        setAiError(
          resp.message ||
            'Image safety analysis is unavailable. You can continue by selecting category and severity manually.'
        );
      }
    } catch {
      setAiError(
        'Image safety analysis is unavailable. You can continue by selecting category and severity manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ============================================================================
  // AI SUGGESTION ACCEPTANCE & MANUAL OVERRIDES (Step 7 + 8)
  // ============================================================================

  const handleAcceptAISuggestions = (analysis: AIAnalysisResult) => {
    setCategory(analysis.category);
    const sevUpper = analysis.severity.toUpperCase();
    if (sevUpper === 'HIGH' || sevUpper === 'LOW' || sevUpper === 'MEDIUM') {
      setSeverity(sevUpper as 'LOW' | 'MEDIUM' | 'HIGH');
    }

    if (!title.trim() && analysis.summary) {
      setTitle(analysis.summary.slice(0, 120));
    }

    if (!description.trim() && analysis.summary) {
      setDescription(analysis.summary);
    }

    setIsAIAccepted(true);

    // Clear category error if present
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.category;
      return copy;
    });
  };

  const handleEditManually = () => {
    setIsAIAccepted(false);
  };

  // ============================================================================
  // FORM VALIDATION & NAVIGATION
  // ============================================================================

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!category) {
      newErrors.category = 'Please choose a safety category.';
    }

    const currentDesc = description.trim() || voiceTranscript.trim() || imageDescription.trim();
    if (!currentDesc || currentDesc.length < 5) {
      newErrors.description = 'Please describe the observation (at least 5 characters required).';
    }

    if (latitude === null || longitude === null) {
      newErrors.location = 'Please attach your location using GPS or select on the map.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Ensure description is populated from voice/image if blank
    if (!description.trim()) {
      if (voiceTranscript.trim()) {
        setDescription(voiceTranscript.trim());
      } else if (imageDescription.trim()) {
        setDescription(imageDescription.trim());
      } else if (aiAnalysis?.summary) {
        setDescription(aiAnalysis.summary);
      }
    }

    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitFinal = async () => {
    if (!latitude || !longitude) return;

    setIsSubmitting(true);
    setServerError(null);
    setDuplicateData(null);

    try {
      const finalDesc = description.trim() || voiceTranscript.trim() || 'Observed safety hazard.';

      const created = await reportService.createReport({
        category,
        title: title.trim() || undefined,
        description: finalDesc,
        severity,
        latitude,
        longitude,
        location_label: locationLabel.trim() || undefined,
        report_type: modality,
        media_url: uploadedMediaUrl || undefined,
        media_type: imageFile ? imageFile.type : undefined,
        transcript: voiceTranscript || undefined,
      });

      setSubmittedReport(created);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const respData = err.response?.data;
      if (err.response?.status === 409 && respData?.detail) {
        const detail = respData.detail;
        setDuplicateData({
          message: detail.message || 'You recently submitted a similar report for this location.',
          existingId: detail.existing_report_id || '',
        });
      } else {
        const errorMsg =
          typeof respData?.detail === 'string'
            ? respData.detail
            : 'Unable to submit your report. Please check details and try again.';
        setServerError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setDescription('');
    setTitle('');
    setCategory('poor_lighting');
    setSeverity('MEDIUM');
    setLatitude(null);
    setLongitude(null);
    setLocationLabel('');
    setVoiceBlob(null);
    setVoiceTranscript('');
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setImageDescription('');
    setUploadedMediaUrl(null);
    setAiAnalysis(null);
    setIsAIAccepted(false);
    setAiError(null);
    setLastAnalyzedText('');
    setCurrentStep(1);
    setSubmittedReport(null);
    setErrors({});
    setServerError(null);
  };

  // Step 3: Success Screen
  if (currentStep === 3 && submittedReport) {
    return <ReportSuccess report={submittedReport} onReset={handleResetForm} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleLeaveCheck}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Dashboard</span>
        </button>

        {currentStep === 2 && (
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            &larr; Back to Edit
          </button>
        )}
      </div>

      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-cyan-400" />
          Report a Safety Concern
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Report road hazards, broken lighting, and safety concerns using text, voice, or photo evidence.
        </p>
      </div>

      {/* Multi-Modal Input Modality Tabs (Step 8) */}
      <ReportInputTabs
        activeTab={modality}
        onSelectTab={(tab) => {
          setModality(tab);
          setAiError(null);
        }}
        disabled={currentStep !== 1 || isAnalyzing || isSubmitting}
      />

      {/* Gemini Intelligence Status Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong>SafeSphere AI:</strong>{' '}
            {modality === 'voice'
              ? 'Voice recording will be transcribed and classified into standardized safety signals.'
              : modality === 'image'
              ? 'Photos are analyzed for visible infrastructure hazards without facial or identity tracking.'
              : 'Write your observation in plain text and click "Analyze with SafeSphere AI" for instant category suggestions.'}
          </span>
        </div>
      </div>

      {/* Server / Validation Error Banner */}
      {serverError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{serverError}</span>
        </div>
      )}

      {/* STEP 1: FORM INPUTS */}
      {currentStep === 1 && (
        <form onSubmit={handleProceedToReview} className="space-y-6">
          {/* MODALITY 1: TEXT REPORT */}
          {modality === 'text' && (
            <ReportDescription
              title={title}
              onChangeTitle={setTitle}
              description={description}
              onChangeDescription={(val) => {
                setDescription(val);
                if (aiAnalysis && val.trim() !== lastAnalyzedText) {
                  setIsAIAccepted(false);
                }
              }}
              error={errors.description}
              onAnalyzeAI={handleAnalyzeTextWithAI}
              isAnalyzing={isAnalyzing}
              canAnalyzeAI={true}
              cooldownSeconds={cooldownSeconds}
              aiError={aiError}
            />
          )}

          {/* MODALITY 2: VOICE REPORT (Step 8) */}
          {modality === 'voice' && (
            <div className="space-y-4">
              <VoiceReportRecorder
                onAudioReady={handleVoiceAudioReady}
                onAnalyzeAudio={handleAnalyzeVoiceDirect}
                onTranscribeOnly={handleTranscribeVoiceOnly}
                isProcessing={isAnalyzing || isTranscribingVoice}
              />

              {/* Loading transcription indicator */}
              {isTranscribingVoice && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-300 text-xs flex items-center justify-center gap-2 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Transcribing spoken audio with SafeSphere AI...</span>
                </div>
              )}

              {/* Editable Voice Transcript Card */}
              {(voiceTranscript || unclearSpeechVoice) && (
                <VoiceTranscriptCard
                  transcript={voiceTranscript}
                  onUpdateTranscript={(text) => {
                    setVoiceTranscript(text);
                    setDescription(text);
                  }}
                  onAnalyzeTranscript={handleAnalyzeVoiceTranscript}
                  onRecordAgain={handleVoiceRecordAgain}
                  isAnalyzing={isAnalyzing}
                  unclearSpeech={unclearSpeechVoice}
                />
              )}
            </div>
          )}

          {/* MODALITY 3: IMAGE / PHOTO REPORT (Step 8) */}
          {modality === 'image' && (
            <div className="space-y-4">
              {!imageFile ? (
                <ImageReportUploader
                  onImageSelected={handleImageSelected}
                  disabled={isAnalyzing}
                />
              ) : (
                <ImagePreview
                  imageFile={imageFile}
                  previewUrl={imagePreviewUrl!}
                  description={imageDescription}
                  onChangeDescription={setImageDescription}
                  onReplaceImage={handleReplaceImage}
                  onRemoveImage={handleRemoveImage}
                  onAnalyzeImage={handleAnalyzeImageWithAI}
                  isAnalyzing={isAnalyzing}
                />
              )}
            </div>
          )}

          {/* Loading AI Analysis banner for image/voice */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-center gap-2 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
              <span>Analyzing safety observation with SafeSphere Gemini AI...</span>
            </div>
          )}

          {/* AI Analysis Error Banner */}
          {aiError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{aiError}</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  You can continue submitting by selecting the category and severity manually below.
                </p>
              </div>
            </div>
          )}

          {/* AI Analysis Card (Unified across text, voice, image) */}
          {aiAnalysis && (
            <AIAnalysisCard
              analysis={aiAnalysis}
              onAccept={handleAcceptAISuggestions}
              onEditManually={handleEditManually}
              isAccepted={isAIAccepted}
            />
          )}

          {/* Standard Category Selector (Refined by AI suggestion or manual choice) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-slate-200">
                Safety Category {isAIAccepted && <span className="text-xs font-normal text-purple-400">(AI Suggested &bull; Editable)</span>}
              </span>
            </div>
            <ReportCategorySelector
              selectedCategory={category}
              onSelectCategory={(cat) => {
                setCategory(cat);
                setIsAIAccepted(false);
              }}
            />
            {errors.category && <p className="text-xs text-rose-400 mt-1">{errors.category}</p>}
          </div>

          {/* Standard Severity Selector (Refined by AI suggestion or manual choice) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-slate-200">
                Severity Level {isAIAccepted && <span className="text-xs font-normal text-purple-400">(AI Suggested &bull; Editable)</span>}
              </span>
            </div>
            <ReportSeveritySelector
              selectedSeverity={severity}
              onSelectSeverity={(sev) => {
                setSeverity(sev);
                setIsAIAccepted(false);
              }}
            />
          </div>

          {/* Location Picker */}
          <ReportLocationPicker
            latitude={latitude}
            longitude={longitude}
            locationLabel={locationLabel}
            onSelectLocation={(lat, lon, label) => {
              setLatitude(lat);
              setLongitude(lon);
              setLocationLabel(label);
            }}
            error={errors.location}
          />

          {/* Continue to Review CTA */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <span>Review Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: REVIEW SCREEN */}
      {currentStep === 2 && latitude && longitude && (
        <ReportReview
          category={category}
          title={title}
          description={description || voiceTranscript || imageDescription}
          severity={severity}
          latitude={latitude}
          longitude={longitude}
          locationLabel={locationLabel}
          isSubmitting={isSubmitting}
          isAIAssisted={isAIAccepted}
          modality={modality}
          transcript={voiceTranscript || undefined}
          imagePreviewUrl={imagePreviewUrl || undefined}
          onEdit={() => setCurrentStep(1)}
          onSubmit={handleSubmitFinal}
        />
      )}

      {/* Duplicate Report Modal */}
      {duplicateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Similar Report Detected</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {duplicateData.message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDuplicateData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicateData(null);
                  navigate('/map');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition"
              >
                View on Safety Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Discard Report?</h3>
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have unsaved changes. Leaving now will discard your report.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  navigate('/home');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Discard &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportForm;
