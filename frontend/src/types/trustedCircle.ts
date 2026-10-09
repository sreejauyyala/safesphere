export interface TrustedContactPermissions {
  notify_journey_start: boolean;
  notify_journey_end: boolean;
  notify_safety_mode: boolean;
  notify_sos: boolean;
  share_live_location: boolean;
  notify_emergency_updates: boolean;
}

export interface TrustedContact {
  id: string;
  user_id: string;
  contact_name: string;
  name?: string;
  phone: string;
  phone_number?: string;
  email?: string | null;
  relationship: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED';
  is_emergency_recipient: boolean;
  is_active: boolean;
  permissions: TrustedContactPermissions;
  created_at: string;
  updated_at: string;
}

export interface TrustedContactCreatePayload {
  contact_name: string;
  phone: string;
  email?: string;
  relationship: string;
  is_emergency_recipient?: boolean;
  permissions?: Partial<TrustedContactPermissions>;
}

export interface TrustedContactUpdatePayload {
  contact_name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  is_emergency_recipient?: boolean;
  notify_journey_start?: boolean;
  notify_journey_end?: boolean;
  notify_safety_mode?: boolean;
  notify_sos?: boolean;
  share_live_location?: boolean;
  notify_emergency_updates?: boolean;
}

export interface SOSRecipientNotificationItem {
  recipient_id: string;
  recipient_name: string;
  recipient_type: 'TRUSTED_CONTACT' | 'GUARDIAN';
  delivery_status: 'SENT' | 'DELIVERED' | 'FAILED' | 'UNAVAILABLE' | 'NOT_CONFIGURED' | 'PENDING';
  channel: 'PUSH' | 'SMS' | 'DEV_MOCK';
  attempted_at: string;
  error_message?: string | null;
  location_shared?: boolean;
}

export interface SOSSession {
  id: string;
  user_id: string;
  journey_id?: string | null;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  activated_at: string;
  ended_at?: string | null;
  initial_latitude?: number | null;
  initial_longitude?: number | null;
  latest_latitude?: number | null;
  latest_longitude?: number | null;
  last_location_update?: string | null;
  accuracy?: number | null;
  is_location_stale: boolean;
  emergency_notes?: string | null;
  deactivation_reason?: string | null;
  guardian_alerted: boolean;
  notifications: SOSRecipientNotificationItem[];
  location_sharing_url?: string | null;
  location_sharing_active?: boolean;
  recipients_count?: number;
  provider_configured?: boolean;
}

export interface SOSActivatePayload {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  emergency_notes?: string;
  journey_id?: string | null;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  event_id?: string | null;
  recipient_id?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_type: 'TRUSTED_CONTACT' | 'GUARDIAN';
  event_type: 'JOURNEY_STARTED' | 'JOURNEY_COMPLETED' | 'SAFETY_MODE_ACTIVATED' | 'SOS_ACTIVATED' | 'SOS_ENDED' | 'CONTACT_INVITATION' | 'CONTACT_VERIFICATION';
  channel: 'PUSH' | 'SMS' | 'DEV_MOCK';
  delivery_status: 'CREATED' | 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'UNAVAILABLE';
  message_content?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  attempted_at: string;
  delivered_at?: string | null;
}

export interface ShareSessionResponse {
  id: string;
  journey_id: string;
  share_token: string;
  share_url: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export interface SharedJourneyPublicResponse {
  journey_id: string;
  user_name: string;
  destination_name: string;
  status: string;
  started_at: string;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_location_update?: string | null;
  is_location_stale: boolean;
  distance_travelled: number;
  selected_route_id?: string | null;
  route_geometry?: string | null;
  is_active: boolean;
  expires_at: string;
}
