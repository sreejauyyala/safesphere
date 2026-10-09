export type FeedbackType =
  | 'CONFIRM_ISSUE'
  | 'DISPUTE_ISSUE'
  | 'CONFIRM_RESOLVED'
  | 'REPORT_STILL_PRESENT'
  | 'DUPLICATE_REPORT'
  | 'INACCURATE_LOCATION'
  | 'INACCURATE_CATEGORY'
  | 'GENERAL_FEEDBACK'
  | 'JOURNEY_EXPERIENCE';

export type TargetType =
  | 'SAFETY_REPORT'
  | 'JOURNEY'
  | 'SAFETY_PULSE'
  | 'ROUTE'
  | 'APPLICATION';

export type VerificationStatusType =
  | 'PENDING'
  | 'COMMUNITY_SUPPORTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'REJECTED';

export type ReportStatusType =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'RESOLUTION_DISPUTED'
  | 'REOPENED'
  | 'REJECTED';

export interface CommunityFeedback {
  id: string;
  user_id: string;
  target_type: TargetType;
  target_id?: string;
  feedback_type: FeedbackType;
  rating?: number;
  route_accuracy?: string;
  safety_info_usefulness?: string;
  concern_category?: string;
  response_value?: string;
  comment?: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'HIDDEN' | 'FLAGGED';
  created_at: string;
  updated_at?: string;
}

export interface ReportCommunitySummary {
  report_id: string;
  status: ReportStatusType;
  verification_status: VerificationStatusType;
  confirm_count: number;
  dispute_count: number;
  resolved_count: number;
  still_present_count: number;
  total_responses: number;
  flagged_for_review: boolean;
  reopen_requested: boolean;
  is_duplicate: boolean;
  duplicate_of_id?: string;
  user_response?: CommunityFeedback;
  audit_events_count: number;
}

export interface ReportVerificationPayload {
  feedback_type: FeedbackType;
  comment?: string;
  concern_category?: string;
  response_value?: string;
}

export interface ReportResolutionPayload {
  feedback_type: 'CONFIRM_RESOLVED' | 'REPORT_STILL_PRESENT';
  comment?: string;
  response_value?: string;
}

export interface ReportModerationPayload {
  new_status?: ReportStatusType;
  new_verification_status?: VerificationStatusType;
  review_notes?: string;
}

export interface JourneyFeedbackPayload {
  rating: number; // 1-5
  route_accuracy?: 'MOSTLY_YES' | 'PARTLY' | 'NO' | 'UNABLE_TO_JUDGE';
  safety_info_usefulness?: 'USEFUL' | 'PARTLY_USEFUL' | 'NOT_USEFUL' | 'INSUFFICIENT_DATA';
  comment?: string;
}

export interface GeneralFeedbackPayload {
  category: string;
  rating?: number;
  comment: string;
  related_report_id?: string;
  related_journey_id?: string;
}

export interface ReportAuditLogItem {
  id: string;
  report_id: string;
  actor_id?: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  previous_verification_status?: string;
  new_verification_status?: string;
  reason?: string;
  created_at: string;
}
