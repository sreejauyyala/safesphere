export interface HealthStatus {
  status: string;
  service: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  version: string;
  environment: string;
  database: {
    connected: boolean;
    details: string;
    hint?: string;
  };
  gemini_ai_configured: boolean;
  fcm_configured: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  age?: number;
  is_under_18: boolean;
  role: 'user' | 'guardian' | 'admin' | 'first_responder';
  organization_id?: string;
  is_active: boolean;
}

export interface GuardianContact {
  id: string;
  ward_id: string;
  guardian_name: string;
  relationship_type: string;
  contact_phone: string;
  contact_email?: string;
  is_verified: boolean;
  emergency_alerts_enabled: boolean;
}

export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  email?: string;
  relationship: string;
  is_emergency_recipient: boolean;
}

export type SafetyReportType = 'text' | 'voice' | 'image';
export type IncidentCategory = 'harassment' | 'poor_lighting' | 'suspicious_activity' | 'hazard' | 'general_safety';

export interface SafetyReport {
  id: string;
  user_id?: string;
  report_type: SafetyReportType;
  category: IncidentCategory;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  media_url?: string;
  ai_risk_score?: number;
  ai_analysis_summary?: string;
  verification_count: number;
  status: 'submitted' | 'verified' | 'resolving' | 'resolved' | 'flagged';
  created_at: string;
}

export interface HelpPoint {
  id: string;
  name: string;
  category: 'police' | 'hospital' | 'pharmacy' | 'shelter' | '24x7_store' | 'security_post';
  latitude: number;
  longitude: number;
  address: string;
  phone_number?: string;
  is_verified: boolean;
  is_24_hours: boolean;
}

export interface MapMarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type: 'user' | 'report' | 'help_point' | 'checkpoint';
  category?: string;
  status?: string;
}

export interface RouteData {
  id?: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints: [number, number][];
  distance_meters?: number;
  duration_seconds?: number;
  is_safety_optimized?: boolean;
}
