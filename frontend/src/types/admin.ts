export type OrganizationType =
  | 'COLLEGE'
  | 'COMPANY'
  | 'RESIDENTIAL_COMMUNITY'
  | 'CAMPUS_SECURITY'
  | 'PUBLIC_SPACE_MANAGER'
  | 'LOCAL_AUTHORITY'
  | 'OTHER';

export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export type AssignmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AssignmentStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Organization {
  id: string;
  name: string;
  org_type: OrganizationType | string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  domain?: string | null;
  contact_email: string;
  contact_phone?: string | null;
  status: OrganizationStatus | string;
  is_verified: boolean;
  member_count?: number;
  active_assignments_count?: number;
  created_at: string;
  updated_at?: string | null;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'ADMIN' | 'MEMBER' | 'RESPONDER' | 'DISPATCHER' | string;
  is_active: boolean;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
}

export interface AdminDashboardMetrics {
  total_reports_in_scope: number;
  pending_review: number;
  verified_reports: number;
  active_unresolved_issues: number;
  issues_assigned: number;
  issues_in_progress: number;
  resolved_issues: number;
  resolution_disputes: number;
  avg_resolution_hours: number | null;
  scope_name: string;
  is_system_admin: boolean;
  last_calculated_at: string;
}

export interface ReportAdminItem {
  id: string;
  report_type: string;
  category: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  latitude: number;
  longitude: number;
  address_text?: string | null;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISPUTED' | string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' | string;
  assigned_organization_id?: string | null;
  assigned_organization_name?: string | null;
  community_confirmations: number;
  community_disputes: number;
  resolution_disputes: number;
  active_assignment_id?: string | null;
  assignment_status?: AssignmentStatus | string | null;
  assignment_priority?: AssignmentPriority | string | null;
  has_image: boolean;
  has_voice: boolean;
  image_url?: string | null;
  voice_url?: string | null;
  voice_transcript?: string | null;
  ai_analysis?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface IssueAssignment {
  id: string;
  report_id: string;
  organization_id: string;
  organization_name?: string | null;
  assigned_to_user_id?: string | null;
  assigned_to_user_name?: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  action_description?: string | null;
  target_resolution_at?: string | null;
  assigned_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface IssueResolution {
  id: string;
  report_id: string;
  assignment_id?: string | null;
  assigned_to_org_id?: string | null;
  organization_name?: string | null;
  assigned_responder_id?: string | null;
  responder_name?: string | null;
  status: string;
  action_taken?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface PreventiveActionQueueItem {
  report_id: string;
  category: string;
  title: string;
  severity: string;
  verification_status: string;
  assignment_status: string;
  assignment_priority?: string | null;
  assigned_org_name?: string | null;
  priority_score: number;
  is_overdue: boolean;
  is_disputed: boolean;
  age_hours: number;
  reason_summary: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface AdminHotspotItem {
  hotspot_id: string;
  category: string;
  center_lat: number;
  center_lon: number;
  report_count: number;
  unresolved_count: number;
  verified_count: number;
  highest_severity: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  report_ids: string[];
}

export interface AdminAnalytics {
  scope_name: string;
  is_system_admin: boolean;
  total_reports: number;
  categories_breakdown: Record<string, number>;
  verification_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  resolution_metrics: {
    avg_hours_to_assign: number | null;
    avg_hours_to_resolve: number | null;
    resolution_confirmation_rate_pct: number | null;
    dispute_rate_pct: number | null;
    reopened_count: number;
  };
  monthly_trends: Array<{
    month: string;
    total_reports: number;
    resolved_reports: number;
  }>;
  generated_at: string;
}

export interface AdministrativeAuditLog {
  id: string;
  actor_user_id: string;
  actor_name?: string | null;
  organization_id?: string | null;
  action_type: string;
  target_type: string;
  target_id: string;
  previous_status?: string | null;
  new_status?: string | null;
  reason?: string | null;
  created_at: string;
}
