export interface SafetyModeSession {
  id: string;
  user_id: string;
  journey_id?: string | null;
  status: 'ACTIVE' | 'ENDED' | 'INTERRUPTED';
  activated_at: string;
  deactivated_at?: string | null;
  activation_latitude?: number | null;
  activation_longitude?: number | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_location_update?: string | null;
  notification_status: 'NOT_CONFIGURED' | 'PENDING' | 'SENT' | 'FAILED';
  deactivation_reason?: string | null;
  user_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NearbyHelpPointItem {
  id: string;
  name: string;
  point_type: string;
  category: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  address: string;
  phone_number?: string | null;
  is_verified: boolean;
  is_24_hours: boolean;
}

import type { SOSRecipientNotificationItem } from './trustedCircle';

export interface SafetyModeActiveDetailResponse {
  session: SafetyModeSession;
  journey_id?: string | null;
  journey_title?: string | null;
  journey_destination?: string | null;
  journey_status?: string | null;
  nearby_help_points: NearbyHelpPointItem[];
  location_status: 'available' | 'permission_required' | 'accuracy_limited' | 'delayed';
  notification_message: string;
  guardian_status: {
    is_minor?: boolean;
    has_guardian?: boolean;
    guardian_name?: string;
    relationship?: string;
    verification_status?: string;
    consent_status?: string;
    status?: string;
  };
  available_assistance: string[];
  notifications?: SOSRecipientNotificationItem[];
  recipients_count?: number;
  location_sharing_url?: string | null;
  provider_configured?: boolean;
}

export interface SafetyModeActivatePayload {
  journey_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notify_trusted_contacts?: boolean;
  user_note?: string | null;
}

export interface SafetyModeEndPayload {
  deactivation_reason?: string;
  user_note?: string | null;
  send_safe_confirmation_update?: boolean;
}
