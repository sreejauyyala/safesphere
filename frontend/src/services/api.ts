import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  HealthStatus, 
  DetailedHealthStatus, 
  SafetyReport, 
  HelpPoint, 
  UserProfile, 
  GuardianData, 
  GuardianRelationship 
} from '../types';

// Read API URL from Vite environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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

    // Response interceptor for consistent error normalization
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = 
          error.response?.data?.detail || 
          error.response?.data?.message || 
          error.message || 
          'Network request failed';
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

  async verifyGuardianOTP(otpCode: string): Promise<GuardianData> {
    const res: AxiosResponse<GuardianData> = await this.client.post('/guardians/verify', {
      otp_code: otpCode,
    });
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
}

export const apiService = new ApiService();
export default apiService;
