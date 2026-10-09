import apiService from './api';
import type {
  TrustedContact,
  TrustedContactCreatePayload,
  TrustedContactUpdatePayload,
  NotificationLog,
  ShareSessionResponse,
  SharedJourneyPublicResponse,
} from '../types';

export class TrustedCircleService {
  async getContacts(): Promise<TrustedContact[]> {
    const res = await apiService.getClient().get('/trusted-contacts');
    return res.data;
  }

  async addContact(payload: TrustedContactCreatePayload): Promise<TrustedContact> {
    const res = await apiService.getClient().post('/trusted-contacts', payload);
    return res.data;
  }

  async updateContact(contactId: string, payload: TrustedContactUpdatePayload): Promise<TrustedContact> {
    const res = await apiService.getClient().put(`/trusted-contacts/${contactId}`, payload);
    return res.data;
  }

  async deleteContact(contactId: string): Promise<{ status: string; message: string }> {
    const res = await apiService.getClient().delete(`/trusted-contacts/${contactId}`);
    return res.data;
  }

  async verifyContact(contactId: string, code: string): Promise<TrustedContact> {
    const res = await apiService.getClient().post(`/trusted-contacts/${contactId}/verify`, { code });
    return res.data;
  }

  async resendCode(contactId: string): Promise<{ status: string; message: string; dev_code?: string }> {
    const res = await apiService.getClient().post(`/trusted-contacts/${contactId}/resend-code`);
    return res.data;
  }

  async getNotifications(limit: number = 25): Promise<NotificationLog[]> {
    const res = await apiService.getClient().get('/notifications', { params: { limit } });
    return res.data;
  }

  // --- Journey Sharing ---
  async createSharingSession(journeyId: string, durationHours: number = 4): Promise<ShareSessionResponse> {
    const res = await apiService.getClient().post('/sharing/sessions', {
      journey_id: journeyId,
      duration_hours: durationHours,
    });
    return res.data;
  }

  async getSharedJourney(tokenOrId: string): Promise<SharedJourneyPublicResponse> {
    const res = await apiService.getClient().get(`/sharing/sessions/${tokenOrId}`);
    return res.data;
  }

  async revokeSharingSession(sessionId: string): Promise<{ status: string; message: string }> {
    const res = await apiService.getClient().delete(`/sharing/sessions/${sessionId}`);
    return res.data;
  }
}

export const trustedCircleService = new TrustedCircleService();
export default trustedCircleService;
