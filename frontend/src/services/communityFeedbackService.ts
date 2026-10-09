import apiService from './api';
import type {
  CommunityFeedback,
  ReportCommunitySummary,
  ReportVerificationPayload,
  ReportResolutionPayload,
  ReportModerationPayload,
  JourneyFeedbackPayload,
  GeneralFeedbackPayload,
  ReportAuditLogItem,
  ReportItem,
} from '../types';

export class CommunityFeedbackService {
  /**
   * Fetches community confirmation and dispute counts, status flags, and user's private vote.
   */
  async getReportCommunitySummary(reportId: string): Promise<ReportCommunitySummary> {
    const res = await apiService.getClient().get(`/reports/${reportId}/community-feedback`);
    return res.data;
  }

  /**
   * Submits an independent observation or accuracy dispute for a safety report.
   * Strictly enforces 1 active vote per user (updates existing vote on subsequent calls).
   */
  async submitReportVerificationFeedback(
    reportId: string,
    payload: ReportVerificationPayload
  ): Promise<{ feedback: CommunityFeedback; summary: ReportCommunitySummary }> {
    const res = await apiService.getClient().post(`/reports/${reportId}/verification-feedback`, payload);
    return res.data;
  }

  /**
   * Submits community confirmation or dispute regarding an officially resolved issue.
   * If REPORT_STILL_PRESENT is chosen, marks report for reopening review.
   */
  async submitReportResolutionFeedback(
    reportId: string,
    payload: ReportResolutionPayload
  ): Promise<{ feedback: CommunityFeedback; summary: ReportCommunitySummary }> {
    const res = await apiService.getClient().post(`/reports/${reportId}/resolution-feedback`, payload);
    return res.data;
  }

  /**
   * Authorized review & moderation workflow (SYSTEM_ADMIN, ORGANIZATION_ADMIN, ADMIN or owner).
   */
  async moderateReport(
    reportId: string,
    payload: ReportModerationPayload
  ): Promise<{ report: ReportItem; audit_log: ReportAuditLogItem }> {
    const res = await apiService.getClient().post(`/reports/${reportId}/moderate`, payload);
    return res.data;
  }

  /**
   * Retrieves candidate duplicate reports nearby within radius (default 150m).
   */
  async getReportDuplicates(reportId: string, radiusMeters: number = 150): Promise<ReportItem[]> {
    const res = await apiService.getClient().get(`/reports/${reportId}/duplicates`, {
      params: { radius_meters: radiusMeters },
    });
    return res.data;
  }

  /**
   * Retrieves audit history of status and verification changes for a safety report.
   */
  async getReportAuditLogs(reportId: string): Promise<ReportAuditLogItem[]> {
    const res = await apiService.getClient().get(`/reports/${reportId}/audit-logs`);
    return res.data;
  }

  /**
   * Submits 1-5 star experience and safety information usefulness ratings for a completed journey.
   */
  async submitJourneyFeedback(
    journeyId: string,
    payload: JourneyFeedbackPayload
  ): Promise<CommunityFeedback> {
    const res = await apiService.getClient().post(`/journeys/${journeyId}/feedback`, payload);
    return res.data;
  }

  /**
   * Gets authenticated user's private feedback for their journey.
   */
  async getMyJourneyFeedback(journeyId: string): Promise<CommunityFeedback | null> {
    try {
      const res = await apiService.getClient().get(`/journeys/${journeyId}/feedback/me`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Submits general application, routing, map, or accessibility feedback.
   */
  async submitGeneralFeedback(payload: GeneralFeedbackPayload): Promise<CommunityFeedback> {
    const res = await apiService.getClient().post('/feedback', payload);
    return res.data;
  }

  /**
   * Retrieves user's private history of feedback submissions across the platform.
   */
  async getMyFeedbackHistory(limit: number = 50, skip: number = 0): Promise<CommunityFeedback[]> {
    const res = await apiService.getClient().get('/feedback/me', {
      params: { limit, skip },
    });
    return res.data;
  }
}

export const communityFeedbackService = new CommunityFeedbackService();
export default communityFeedbackService;
