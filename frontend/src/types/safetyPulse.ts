export type SafetyPulseRiskLevel = 'lower' | 'moderate' | 'elevated' | 'higher' | 'unknown';
export type SafetyPulseConfidence = 'high' | 'moderate' | 'low' | 'insufficient';
export type SafetyPulseFreshness = 'fresh' | 'moderate' | 'limited' | 'stale' | 'insufficient';

export interface SafetyPulseSignalItem {
  id: string;
  category: string;
  severity: string;
  title: string;
  description?: string | null;
  distance_m: number;
  created_at: string;
  status: string;
  verification_status: string;
  penalty_contribution: number;
}

export interface SafetyPulseResponse {
  status: 'available' | 'insufficient_data';
  score: number | null;
  risk_level: SafetyPulseRiskLevel;
  confidence: SafetyPulseConfidence;
  data_freshness: SafetyPulseFreshness;
  assessment_radius_m: number;
  evaluated_at: string;
  verified_unresolved_reports: number;
  verified_resolved_reports: number;
  pending_reports_count: number;
  verified_help_points_count: number;
  strongest_signals: SafetyPulseSignalItem[];
  unavailable_sources: string[];
  limitations: string[];
  time_context_applied?: string | null;
  disclaimer: string;
}

export interface SafetyPulseHistorySnapshot {
  timestamp: string;
  score: number | null;
  status: string;
  active_verified_reports: number;
  resolved_reports: number;
}

export interface SafetyPulseHistoryResponse {
  status: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  history: SafetyPulseHistorySnapshot[];
  trend_summary: string;
}
