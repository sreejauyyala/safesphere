/**
 * SafeSphere Safety Report Service (Step 6)
 * Handles creating, fetching, listing, and deleting safety reports.
 */
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { ReportCreatePayload, ReportItem } from '../types';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

class ReportService {
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

    // Attach stored JWT / dev-token
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
  }

  /**
   * Submit a new safety report.
   */
  async createReport(data: ReportCreatePayload): Promise<ReportItem> {
    const res = await this.client.post<ReportItem>('/reports', data);
    return res.data;
  }

  /**
   * Fetch authenticated user's submitted safety reports.
   */
  async getMyReports(skip = 0, limit = 50): Promise<ReportItem[]> {
    const res = await this.client.get<ReportItem[]>('/reports/me', {
      params: { skip, limit },
    });
    return res.data || [];
  }

  /**
   * Fetch a single safety report by ID.
   */
  async getReport(reportId: string): Promise<ReportItem> {
    const res = await this.client.get<ReportItem>(`/reports/${reportId}`);
    return res.data;
  }

  /**
   * Delete a safety report owned by the user.
   */
  async deleteReport(reportId: string): Promise<{ status: string; message: string }> {
    const res = await this.client.delete<{ status: string; message: string }>(`/reports/${reportId}`);
    return res.data;
  }

  /**
   * Get public reports near coordinates.
   */
  async getNearbyReports(params: {
    latitude: number;
    longitude: number;
    radius_meters?: number;
    category?: string;
    severity?: string;
    status?: string;
    limit?: number;
  }): Promise<ReportItem[]> {
    const res = await this.client.get<ReportItem[]>('/reports/nearby', { params });
    return res.data || [];
  }
}

export const reportService = new ReportService();
export default reportService;
