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
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_VERIFIED';
export type ConsentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface GuardianData {
  id: string;
  minor_user_id: string;
  guardian_name: string;
  guardian_phone: string;
  masked_phone?: string;
  guardian_email?: string;
  masked_email?: string;
  relationship: GuardianRelationship;
  verification_status: VerificationStatus;
  consent_status: ConsentStatus;
  phone_verified?: boolean;
  email_verified?: boolean;
  verified_delivery_method?: string;
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

// Trusted Contact & SOS types exported from ./trustedCircle at bottom of file

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

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GeolocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export type JourneyStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Journey {
  id: string;
  user_id: string;
  destination_name: string;
  title: string;
  start_latitude: number;
  start_longitude: number;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  status: JourneyStatus;
  started_at: string;
  ended_at?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_location_update?: string | null;
  distance_travelled: number;
  // Step 10 Planned Route integration
  selected_route_id?: string | null;
  route_provider?: string | null;
  route_geometry?: string | null;
  planned_distance_m?: number | null;
  planned_duration_seconds?: number | null;
  estimated_risk_level?: string | null;
  route_data_coverage?: number | null;
  route_assessed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyLocationPoint {
  id: string;
  journey_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: string;
}

export interface JourneyCreatePayload {
  destination_name: string;
  title?: string;
  start_latitude: number;
  start_longitude: number;
  destination_latitude?: number;
  destination_longitude?: number;
  // Step 10 Planned Route attributes
  selected_route_id?: string | null;
  route_provider?: string | null;
  route_geometry?: string | null;
  planned_distance_m?: number | null;
  planned_duration_seconds?: number | null;
  estimated_risk_level?: string | null;
  route_data_coverage?: number | null;
  route_assessed_at?: string | null;
}

export interface JourneySummary {
  id: string;
  destination_name: string;
  status: string;
  duration_minutes: number;
  distance_travelled: number;
  points_recorded: number;
}

// --- Step 5: SafeSphere Safety Map Types ---
export type SafetyReportCategory =
  | 'poor_lighting'
  | 'road_damage'
  | 'road_obstruction'
  | 'isolated_area'
  | 'transport_issue'
  | 'general_safety'
  | 'other';

export type HelpPointType =
  | 'police_station'
  | 'hospital'
  | 'security_desk'
  | 'campus_security'
  | 'verified_help_point'
  | 'other';

export interface MapSafetyReport {
  id: string;
  category: SafetyReportCategory | string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  status: string;
  verification_status: string;
  created_at: string;
}

export interface MapHelpPoint {
  id: string;
  name: string;
  type: HelpPointType | string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  phone?: string;
  verified: boolean;
  is_24_hours: boolean;
  created_at: string;
}

export interface MapHotspot {
  id: string;
  label: string;
  level: 'low' | 'moderate' | 'elevated' | 'higher' | string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  source: string;
  description?: string;
  updated_at: string;
}

export interface MapFilterState {
  categories: string[];
  helpPointTypes: string[];
  showHotspots: boolean;
  showReports: boolean;
  showHelpPoints: boolean;
}

export interface SearchResultLocation {
  name: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface ReportCreatePayload {
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  latitude: number;
  longitude: number;
  location_label?: string;
  title?: string;
  report_type?: string;
  media_url?: string;
  media_type?: string;
  transcript?: string;
}

export interface ReportItem {
  id: string;
  user_id?: string;
  report_type: string;
  category: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  latitude: number;
  longitude: number;
  location_label?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED' | string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  verification_count?: number;
  media_url?: string;
  media_type?: string;
  transcript?: string;
  created_at: string;
  updated_at?: string;
}


export * from './ai';
export * from './safetyPulse';
export * from './route';
export * from './safetyMode';
export * from './trustedCircle';
export * from './feedback';
export * from './admin';

