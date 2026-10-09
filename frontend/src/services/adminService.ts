import apiService from './api';
import type {
  AdminDashboardMetrics,
  ReportAdminItem,
  IssueAssignment,
  IssueResolution,
  PreventiveActionQueueItem,
  AdminHotspotItem,
  AdminAnalytics,
  AdministrativeAuditLog,
  Organization,
  OrganizationMembership,
} from '../types';

export interface ReportFilterParams {
  category?: string;
  severity?: string;
  verification_status?: string;
  status?: string;
  organization_id?: string;
  is_assigned?: boolean;
  is_disputed?: boolean;
  sort_by?: 'newest' | 'oldest' | 'severity' | 'status' | 'assigned_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AssignmentFilterParams {
  organization_id?: string;
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAssignmentPayload {
  report_id: string;
  organization_id: string;
  assigned_to_user_id?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  action_description?: string;
  target_resolution_at?: string;
}

export interface UpdateAssignmentPayload {
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
  action_description?: string;
  assigned_to_user_id?: string;
  target_resolution_at?: string;
}

export interface SubmitResolutionPayload {
  action_taken: string;
  assignment_id?: string;
  resolution_notes?: string;
}

export interface ReopenResolutionPayload {
  reason: string;
  reassign_to_org_id?: string;
}

export class AdminService {
  /**
   * Fetches real aggregate metrics for the organization or system administrator.
   */
  async getDashboard(): Promise<AdminDashboardMetrics> {
    const res = await apiService.getClient().get<AdminDashboardMetrics>('/admin/dashboard');
    return res.data;
  }

  /**
   * Retrieves paginated, filtered safety reports in administrative scope.
   */
  async getReports(params?: ReportFilterParams): Promise<{
    items: ReportAdminItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const res = await apiService.getClient().get('/admin/reports', { params });
    return res.data;
  }

  /**
   * Retrieves detailed single report for admin review.
   */
  async getReport(reportId: string): Promise<ReportAdminItem> {
    const res = await apiService.getClient().get<ReportAdminItem>(`/admin/reports/${reportId}`);
    return res.data;
  }

  /**
   * Officially verifies a report with an audit trail note.
   */
  async verifyReport(reportId: string, reason?: string): Promise<ReportAdminItem> {
    const res = await apiService.getClient().post<ReportAdminItem>(`/admin/reports/${reportId}/verify`, {
      reason: reason || 'Officially verified by authorized administrator.',
    });
    return res.data;
  }

  /**
   * Rejects an invalid/unfounded report.
   */
  async rejectReport(reportId: string, reason?: string): Promise<ReportAdminItem> {
    const res = await apiService.getClient().post<ReportAdminItem>(`/admin/reports/${reportId}/reject`, {
      reason: reason || 'Rejected by authorized administrator.',
    });
    return res.data;
  }

  /**
   * Flags a report for additional review or legal investigation.
   */
  async flagReport(reportId: string, reason?: string): Promise<ReportAdminItem> {
    const res = await apiService.getClient().post<ReportAdminItem>(`/admin/reports/${reportId}/flag`, {
      reason: reason || 'Flagged for internal administrative review.',
    });
    return res.data;
  }

  /**
   * Assigns a report to an organization or responder.
   */
  async createAssignment(payload: CreateAssignmentPayload): Promise<IssueAssignment> {
    const res = await apiService.getClient().post<IssueAssignment>('/admin/assignments', payload);
    return res.data;
  }

  /**
   * Fetches issue assignments.
   */
  async getAssignments(params?: AssignmentFilterParams): Promise<IssueAssignment[]> {
    const res = await apiService.getClient().get<IssueAssignment[]>('/admin/assignments', { params });
    return res.data;
  }

  /**
   * Gets details for a specific assignment.
   */
  async getAssignment(assignmentId: string): Promise<IssueAssignment> {
    const res = await apiService.getClient().get<IssueAssignment>(`/admin/assignments/${assignmentId}`);
    return res.data;
  }

  /**
   * Updates an assignment (status, priority, action description).
   */
  async updateAssignment(assignmentId: string, payload: UpdateAssignmentPayload): Promise<IssueAssignment> {
    const res = await apiService.getClient().patch<IssueAssignment>(`/admin/assignments/${assignmentId}`, payload);
    return res.data;
  }

  /**
   * Officially resolves a report with corrective action details.
   */
  async submitResolution(reportId: string, payload: SubmitResolutionPayload): Promise<IssueResolution> {
    const res = await apiService.getClient().post<IssueResolution>(`/admin/reports/${reportId}/resolution`, payload);
    return res.data;
  }

  /**
   * Reopens a disputed or incomplete resolution.
   */
  async reopenResolution(resolutionId: string, payload: ReopenResolutionPayload): Promise<IssueResolution> {
    const res = await apiService.getClient().post<IssueResolution>(`/admin/resolutions/${resolutionId}/reopen`, payload);
    return res.data;
  }

  /**
   * Retrieves deterministic prioritized action queue.
   */
  async getActionQueue(limit = 25): Promise<PreventiveActionQueueItem[]> {
    const res = await apiService.getClient().get<PreventiveActionQueueItem[]>('/admin/action-queue', {
      params: { limit },
    });
    return res.data;
  }

  /**
   * Retrieves safety hotspots and recurring issue clusters.
   */
  async getHotspots(radiusMeters = 500, minReports = 2): Promise<AdminHotspotItem[]> {
    const res = await apiService.getClient().get<AdminHotspotItem[]>('/admin/hotspots', {
      params: { radius_meters: radiusMeters, min_reports: minReports },
    });
    return res.data;
  }

  /**
   * Retrieves organization or system-wide analytics.
   */
  async getAnalytics(timeWindowDays = 30): Promise<AdminAnalytics> {
    const res = await apiService.getClient().get<AdminAnalytics>('/admin/analytics', {
      params: { time_window_days: timeWindowDays },
    });
    return res.data;
  }

  /**
   * Retrieves administrative audit log history.
   */
  async getAuditLogs(limit = 50): Promise<AdministrativeAuditLog[]> {
    const res = await apiService.getClient().get<AdministrativeAuditLog[]>('/admin/audit-logs', {
      params: { limit },
    });
    return res.data;
  }

  /**
   * Retrieves the current user's organization profile.
   */
  async getMyOrganization(): Promise<Organization> {
    const res = await apiService.getClient().get<Organization>('/organizations/me');
    return res.data;
  }

  /**
   * System-admin list of all registered organizations.
   */
  async getOrganizations(): Promise<Organization[]> {
    const res = await apiService.getClient().get<Organization[]>('/organizations');
    return res.data;
  }

  /**
   * System-admin registers a new organization.
   */
  async createOrganization(payload: Partial<Organization>): Promise<Organization> {
    const res = await apiService.getClient().post<Organization>('/organizations', payload);
    return res.data;
  }

  /**
   * Retrieves organization details.
   */
  async getOrganization(orgId: string): Promise<Organization> {
    const res = await apiService.getClient().get<Organization>(`/organizations/${orgId}`);
    return res.data;
  }

  /**
   * Updates an organization's profile or status.
   */
  async updateOrganization(orgId: string, payload: Partial<Organization>): Promise<Organization> {
    const res = await apiService.getClient().patch<Organization>(`/organizations/${orgId}`, payload);
    return res.data;
  }

  /**
   * Adds an administrator or member to an organization.
   */
  async addOrganizationMember(
    orgId: string,
    payload: { user_id: string; role?: string }
  ): Promise<OrganizationMembership> {
    const res = await apiService.getClient().post<OrganizationMembership>(`/organizations/${orgId}/members`, payload);
    return res.data;
  }
}

export const adminService = new AdminService();
export default adminService;
