import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  HealthStatus, 
  DetailedHealthStatus, 
  SafetyReport, 
  HelpPoint, 
  UserProfile, 
  GuardianData, 
  GuardianRelationship,
} from '../types';

// Read API URL from Vite environment variables with automatic /api/v1 normalization
export const getApiBaseUrl = (): string => {
  const raw = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();

export interface UserRegisterPayload {
  firebase_uid: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  user_type: string;
  profile_image_url?: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  phone?: string;
  user_type?: string;
  profile_image_url?: string;
}

export interface GuardianCreatePayload {
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  relationship: GuardianRelationship;
}

export interface GuardianUpdatePayload {
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  relationship?: GuardianRelationship;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Request interceptor to attach JWT if available
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('safesphere_auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for consistent, user-friendly error normalization
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        let message = 'An unexpected error occurred. Please try again.';

        if (!error.response) {
          // Connection refused, network offline, or backend server not running
          message = 'Unable to connect to the SafeSphere server. Please ensure the backend server is running.';
        } else if (error.response?.status === 404 && (!error.response?.data?.detail || String(error.response?.data?.detail).trim().toLowerCase() === 'not found')) {
          message = 'The verification endpoint could not be found. Please contact the administrator.';
        } else if (error.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (typeof detail === 'string') {
            message = detail;
          } else if (Array.isArray(detail)) {
            // Format FastAPI Pydantic 422 validation errors into human-readable strings
            message = detail
              .map((item: any) => {
                const field = Array.isArray(item.loc) ? item.loc.filter((l: any) => l !== 'body').join('.') : '';
                const msg = item.msg ? item.msg.replace(/^Value error,\s*/i, '') : 'Invalid value';
                return field ? `${field}: ${msg}` : msg;
              })
              .join(' | ');
          } else if (typeof detail === 'object') {
            message = detail.message || JSON.stringify(detail);
          }
        } else if (error.response?.data?.message) {
          message = error.response.data.message;
        } else if (error.message && error.message !== 'Network Error') {
          message = error.message;
        }

        const customError = {
          message,
          status: error.response?.status,
          data: error.response?.data,
        };
        return Promise.reject(customError);
      }
    );
  }

  // --- Health Endpoints ---
  async getHealth(): Promise<HealthStatus> {
    const res: AxiosResponse<HealthStatus> = await this.client.get('/health');
    return res.data;
  }

  async getHealthDetails(): Promise<DetailedHealthStatus> {
    const res: AxiosResponse<DetailedHealthStatus> = await this.client.get('/health/details');
    return res.data;
  }

  // --- User Profile Endpoints ---
  async registerUserProfile(data: UserRegisterPayload): Promise<UserProfile> {
    const res: AxiosResponse<UserProfile> = await this.client.post('/auth/register', data);
    return res.data;
  }

  async getCurrentUserProfile(): Promise<UserProfile> {
    const res: AxiosResponse<UserProfile> = await this.client.get('/users/me');
    return res.data;
  }

  async updateUserProfile(data: UserUpdatePayload): Promise<UserProfile> {
    const res: AxiosResponse<UserProfile> = await this.client.put('/users/me', data);
    return res.data;
  }

  // --- Guardian Connect Endpoints ---
  async linkGuardian(data: GuardianCreatePayload): Promise<GuardianData> {
    const res: AxiosResponse<GuardianData> = await this.client.post('/guardians', data);
    return res.data;
  }

  async getMyGuardian(): Promise<GuardianData> {
    const res: AxiosResponse<GuardianData> = await this.client.get('/guardians/me');
    return res.data;
  }

  async updateMyGuardian(data: GuardianUpdatePayload): Promise<GuardianData> {
    const res: AxiosResponse<GuardianData> = await this.client.put('/guardians/me', data);
    return res.data;
  }

  async removeMyGuardian(): Promise<{ status: string; message: string }> {
    const res = await this.client.delete('/guardians/me');
    return res.data;
  }

  // --- Safety Reports ---
  async getSafetyReports(): Promise<SafetyReport[]> {
    const res = await this.client.get('/safety-reports');
    return res.data?.reports || [];
  }

  async submitSafetyReport(data: Partial<SafetyReport>): Promise<{ status: string; message: string }> {
    const res = await this.client.post('/safety-reports', data);
    return res.data;
  }

  // --- Help Points ---
  async getNearbyHelpPoints(lat: number, lng: number, radiusMeters: number = 2000): Promise<HelpPoint[]> {
    const res = await this.client.get('/help-points/nearby', {
      params: { lat, lng, radius_meters: radiusMeters },
    });
    return res.data?.help_points || [];
  }

  // --- SOS Emergency ---
  async triggerSOS(): Promise<{ status: string; message: string }> {
    const res = await this.client.post('/sos/trigger');
    return res.data;
  }

  // --- Safe Routing ---
  async getSafeRouteRecommendation(): Promise<any> {
    const res = await this.client.post('/journeys/route-recommendation');
    return res.data;
  }

  // --- Step 4 & 10: Journey & Safety-Aware Routing Endpoints ---
  async createJourney(data: import('../types').JourneyCreatePayload): Promise<any> {
    const res = await this.client.post('/journeys', data);
    return res.data;
  }

  async getRouteAlternatives(
    data: import('../types').RouteAlternativesRequest
  ): Promise<import('../types').RouteAlternativesResponse> {
    const res = await this.client.post('/routes/alternatives', data);
    return res.data;
  }

  async assessCustomRouteSafety(data: any): Promise<any> {
    const res = await this.client.post('/routes/assess-safety', data);
    return res.data;
  }

  async getRoutingProviderInfo(): Promise<import('../types').RouteProviderInfo> {
    const res = await this.client.get('/routes/provider-info');
    return res.data;
  }

  async getActiveJourney(): Promise<any | null> {
    const res = await this.client.get('/journeys/active');
    return res.data;
  }

  async getUserJourneys(): Promise<any[]> {
    const res = await this.client.get('/journeys');
    return res.data || [];
  }

  async getJourneyById(journeyId: string): Promise<any> {
    const res = await this.client.get(`/journeys/${journeyId}`);
    return res.data;
  }

  async recordJourneyLocation(
    journeyId: string,
    data: { latitude: number; longitude: number; accuracy?: number | null; timestamp?: string }
  ): Promise<any> {
    const res = await this.client.post(`/journeys/${journeyId}/location`, data);
    return res.data;
  }

  async pauseJourney(journeyId: string): Promise<any> {
    const res = await this.client.post(`/journeys/${journeyId}/pause`);
    return res.data;
  }

  async resumeJourney(journeyId: string): Promise<any> {
    const res = await this.client.post(`/journeys/${journeyId}/resume`);
    return res.data;
  }

  async endJourney(journeyId: string): Promise<any> {
    const res = await this.client.post(`/journeys/${journeyId}/end`);
    return res.data;
  }

  async getJourneyLocationPoints(journeyId: string): Promise<any[]> {
    const res = await this.client.get(`/journeys/${journeyId}/locations`);
    return res.data || [];
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiService = new ApiService();
export default apiService;
