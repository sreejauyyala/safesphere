export interface RouteCoordinates {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface TurnByTurnStep {
  instruction: string;
  maneuver_type: string;
  modifier?: string | null;
  road_name?: string | null;
  distance_m: number;
  duration_seconds: number;
}

export type TransportMode = 'car' | 'two_wheeler' | 'bicycle' | 'walking';

export interface RouteRiskAssessment {
  status: 'available' | 'insufficient_data' | 'unavailable';
  risk_level: 'lower' | 'moderate' | 'elevated' | 'higher' | 'unknown' | 'insufficient_data';
  score: number | null;
  color: 'green' | 'yellow' | 'red' | 'grey';
  color_hex: string;
  label: string;
  confidence: 'high' | 'moderate' | 'low' | 'insufficient';
  data_coverage: number; // 0.0 - 1.0
  data_coverage_label: 'high' | 'moderate' | 'low' | 'insufficient';
  verified_issues_count?: number;
  assessed_samples_count: number;
  total_samples_count: number;
}

export interface RouteRelevantIssue {
  report_id: string;
  category: string;
  category_label: string;
  severity: string;
  description: string;
  distance_from_route_m: number;
  location_label?: string | null;
  latitude: number;
  longitude: number;
  created_at?: string | null;
  mode_relevance: string;
  is_night_factor: boolean;
}

export interface RouteSignalSummary {
  signal_type: 'verified_report' | 'help_point' | 'incident' | 'lighting' | 'infrastructure';
  category: string;
  severity?: string | null;
  description: string;
  distance_from_route_m: number;
  location_label?: string | null;
}

export type RouteType = 'fastest' | 'shortest' | 'lower_estimated_risk' | 'standard' | 'alternative';
export type RouteSortPriority = 'safety' | 'time' | 'distance';

export interface RouteAlternativeItem {
  route_id: string;
  route_type: RouteType;
  route_type_label?: string;
  distance_m: number;
  duration_seconds: number;
  provider: string;
  transport_mode?: string;
  origin: RouteCoordinates;
  destination: RouteCoordinates;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [longitude, latitude]
  };
  steps?: TurnByTurnStep[];
  two_wheeler_disclaimer?: string | null;
  risk_assessment: RouteRiskAssessment;
  safety_assessment?: RouteRiskAssessment;
  strongest_signals: RouteSignalSummary[];
  relevant_issues?: RouteRelevantIssue[];
  distinct_verified_issues_count?: number;
  explanation?: string;
  limitations: string[];
  summary_tags: string[];
}

export interface RouteAlternativesResponse {
  routes: RouteAlternativeItem[];
  recommendation_status: 'recommended' | 'insufficient_data' | 'no_alternatives' | 'unavailable';
  recommended_route_id?: string | null;
  recommendation_reason?: string | null;
  limitations: string[];
  disclaimer: string;
}

export interface RouteAlternativesRequest {
  origin: RouteCoordinates;
  destination: RouteCoordinates;
  profile?: 'walking' | 'driving' | 'cycling' | 'two_wheeler' | string;
  travel_mode?: string;
  departure_time?: string;
  alternatives?: boolean;
}

export interface RouteProviderInfo {
  provider: string;
  base_url?: string;
  timeout_seconds: number;
  sample_interval_m: number;
  max_sample_points: number;
  status: string;
}
