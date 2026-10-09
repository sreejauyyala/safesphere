export type SafetyCategory =
  | 'poor_lighting'
  | 'road_damage'
  | 'road_obstruction'
  | 'isolated_area'
  | 'transport_issue'
  | 'general_safety'
  | 'other';

export type SafetySeverity = 'low' | 'medium' | 'high';

export interface AIAnalysisResult {
  category: SafetyCategory;
  severity: SafetySeverity;
  summary: string;
  safety_signal: string;
  confidence: number; // 0.0 to 1.0
  suggested_action: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  code?: string;
  message?: string;
  analysis?: AIAnalysisResult;
}

export interface AITranscriptionResponse {
  success: boolean;
  code?: string;
  message?: string;
  transcript?: string;
}

export interface AIAudioAnalysisResponse {
  success: boolean;
  code?: string;
  message?: string;
  transcript?: string;
  input_type?: string;
  analysis?: AIAnalysisResult;
}

export interface AIImageAnalysisResponse {
  success: boolean;
  code?: string;
  message?: string;
  media_url?: string;
  input_type?: string;
  analysis?: AIAnalysisResult;
}

