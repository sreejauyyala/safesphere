import axios from 'axios';
import type {
  SafetyPulseResponse,
  SafetyPulseHistoryResponse,
} from '../types';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

class SafetyPulseService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  /**
   * Fetches real-time deterministic Safety Pulse risk estimation for coordinates.
   */
  async getSafetyPulse(
    latitude: number,
    longitude: number,
    radius: number = 500,
    timeContext?: string | null,
    signal?: AbortSignal
  ): Promise<SafetyPulseResponse> {
    const params: Record<string, any> = {
      latitude,
      longitude,
      radius,
    };
    if (timeContext && timeContext !== 'all') {
      params.time_context = timeContext;
    }

    const response = await this.client.get<SafetyPulseResponse>('/safety-pulse', {
      params,
      signal,
    });
    return response.data;
  }

  /**
   * Fetches historical Safety Pulse report progressions and resolution statistics.
   */
  async getSafetyPulseHistory(
    latitude: number,
    longitude: number,
    radius: number = 500,
    timeRange: string = '30d',
    signal?: AbortSignal
  ): Promise<SafetyPulseHistoryResponse> {
    const response = await this.client.get<SafetyPulseHistoryResponse>('/safety-pulse/history', {
      params: {
        latitude,
        longitude,
        radius,
        time_range: timeRange,
      },
      signal,
    });
    return response.data;
  }
}

export const safetyPulseService = new SafetyPulseService();
export default safetyPulseService;
