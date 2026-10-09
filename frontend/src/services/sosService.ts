import apiService from './api';
import type { SOSSession, SOSActivatePayload } from '../types';

export class SOSService {
  async activateSOS(payload: SOSActivatePayload): Promise<SOSSession> {
    const res = await apiService.getClient().post('/sos/activate', payload);
    return res.data;
  }

  async getCurrentSOS(): Promise<SOSSession | null> {
    const res = await apiService.getClient().get('/sos/current');
    return res.data;
  }

  async getSOSHistory(limit: number = 15): Promise<SOSSession[]> {
    const res = await apiService.getClient().get('/sos/history', { params: { limit } });
    return res.data;
  }

  async updateLocation(sessionId: string, latitude: number, longitude: number, accuracy?: number): Promise<SOSSession> {
    const res = await apiService.getClient().post(`/sos/${sessionId}/location`, {
      latitude,
      longitude,
      accuracy,
    });
    return res.data;
  }

  async endSOS(sessionId: string, deactivationReason: string = 'Situation resolved'): Promise<SOSSession> {
    const res = await apiService.getClient().post(`/sos/${sessionId}/end`, {
      deactivation_reason: deactivationReason,
    });
    return res.data;
  }
}

export const sosService = new SOSService();
export default sosService;
