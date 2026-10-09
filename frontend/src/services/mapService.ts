/**
 * SafeSphere Map Service
 * Provides typed REST client methods for fetching safety reports, verified help points,
 * and community safety hotspot clusters with geographic filtering.
 */
import axios from 'axios';
import type {
  MapSafetyReport,
  MapHelpPoint,
  MapHotspot,
} from '../types';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

class MapService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 12000,
  });

  /**
   * Fetches public safety reports with optional category and proximity filters.
   */
  async getSafetyReports(params?: {
    category?: string;
    severity?: string;
    status?: string;
    verification_status?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
  }): Promise<MapSafetyReport[]> {
    try {
      const res = await this.client.get('/map/reports', { params });
      return res.data || [];
    } catch (err) {
      console.error('Error fetching safety reports for map:', err);
      return [];
    }
  }

  /**
   * Fetches verified 24/7 help points (police stations, hospitals, security posts).
   */
  async getHelpPoints(params?: {
    type?: string;
    category?: string;
    verified_only?: boolean;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
  }): Promise<MapHelpPoint[]> {
    try {
      const res = await this.client.get('/map/help-points', {
        params: { verified_only: true, ...params },
      });
      return res.data || [];
    } catch (err) {
      console.error('Error fetching help points for map:', err);
      return [];
    }
  }

  /**
   * Fetches community safety signal hotspot clusters.
   */
  async getHotspots(params?: {
    level?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
  }): Promise<MapHotspot[]> {
    try {
      const res = await this.client.get('/map/hotspots', { params });
      return res.data || [];
    } catch (err) {
      console.error('Error fetching hotspots for map:', err);
      return [];
    }
  }

  /**
   * Consolidated single roundtrip fetch for all map layers.
   */
  async getConsolidatedMapData(
    latitude?: number,
    longitude?: number,
    radius_meters?: number
  ): Promise<{
    reports: MapSafetyReport[];
    help_points: MapHelpPoint[];
    hotspots: MapHotspot[];
  }> {
    try {
      const params: any = {};
      if (latitude !== undefined) params.latitude = latitude;
      if (longitude !== undefined) params.longitude = longitude;
      if (radius_meters !== undefined) params.radius_meters = radius_meters;

      const res = await this.client.get('/map/data', { params });
      return {
        reports: res.data?.reports || [],
        help_points: res.data?.help_points || [],
        hotspots: res.data?.hotspots || [],
      };
    } catch (err) {
      console.error('Error fetching consolidated map data:', err);
      return { reports: [], help_points: [], hotspots: [] };
    }
  }
}

export const mapService = new MapService();
export default mapService;
