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

export type UserType = 'Student' | 'Employee' | 'General Public' | 'Other';
export type UserRole = 'USER' | 'ORGANIZATION_ADMIN' | 'SYSTEM_ADMIN';
export type GuardianRelationship = 'Parent' | 'Guardian' | 'Mother' | 'Father' | 'Other';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ConsentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface GuardianData {
  id: string;
  minor_user_id: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  relationship: GuardianRelationship;
  verification_status: VerificationStatus;
  consent_status: ConsentStatus;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  firebase_uid: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  age: number;
  is_minor: boolean;
  user_type: UserType;
  role: UserRole;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_guardian: boolean;
  guardian?: GuardianData | null;
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
