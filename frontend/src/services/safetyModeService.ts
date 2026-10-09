import apiService from './api';
import type {
  SafetyModeSession,
  NearbyHelpPointItem,
  SafetyModeActiveDetailResponse,
  SafetyModeActivatePayload,
  SafetyModeEndPayload,
} from '../types';

export class SafetyModeService {
  /**
   * Activates preventive Safety Mode.
   */
  async activate(payload: SafetyModeActivatePayload): Promise<SafetyModeActiveDetailResponse> {
    try {
      const res = await apiService.getClient().post('/safety-mode/activate', payload);
      return res.data;
    } catch (err: any) {
      console.error('Failed to activate safety mode:', err);
      throw err;
    }
  }

  /**
   * Retrieves active safety mode session details and assistance signals.
   */
  async getCurrent(lat?: number, lon?: number): Promise<SafetyModeActiveDetailResponse | null> {
    try {
      const params: any = {};
      if (lat !== undefined) params.latitude = lat;
      if (lon !== undefined) params.longitude = lon;
      const res = await apiService.getClient().get('/safety-mode/current', { params });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      console.error('Failed to get current safety mode:', err);
      throw err;
    }
  }

  /**
   * Deactivates the safety mode session when the user is safe.
   */
  async endSession(sessionId: string, payload: SafetyModeEndPayload): Promise<SafetyModeSession> {
    try {
      const res = await apiService.getClient().post(`/safety-mode/${sessionId}/end`, payload);
      return res.data;
    } catch (err: any) {
      console.error('Failed to end safety mode session:', err);
      throw err;
    }
  }

  /**
   * Retrieves chronological safety session history.
   */
  async getHistory(limit = 20): Promise<SafetyModeSession[]> {
    try {
      const res = await apiService.getClient().get('/safety-mode/history', { params: { limit } });
      return res.data || [];
    } catch (err: any) {
      console.error('Failed to get safety mode history:', err);
      throw err;
    }
  }

  /**
   * Queries verified nearby physical safe havens.
   */
  async getNearbyHelpPoints(lat: number, lon: number, radiusM = 10000): Promise<NearbyHelpPointItem[]> {
    try {
      const res = await apiService.getClient().get('/safety-mode/help-points/nearby', {
        params: { latitude: lat, longitude: lon, radius_m: radiusM },
      });
      return res.data || [];
    } catch (err: any) {
      console.error('Failed to query nearby help points:', err);
      throw err;
    }
  }

  /**
   * Retrieves specific session details.
   */
  async getSessionById(sessionId: string): Promise<SafetyModeSession> {
    try {
      const res = await apiService.getClient().get(`/safety-mode/${sessionId}`);
      return res.data;
    } catch (err: any) {
      console.error('Failed to get safety mode session by ID:', err);
      throw err;
    }
  }
}

export const safetyModeService = new SafetyModeService();
export default safetyModeService;
