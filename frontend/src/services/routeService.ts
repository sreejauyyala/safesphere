import apiService from './api';
import type {
  RouteAlternativesRequest,
  RouteAlternativesResponse,
  RouteProviderInfo,
} from '../types';

export class RouteService {
  /**
   * Fetches candidate route alternatives evaluated with Safety Pulse corridor risks.
   */
  async getRouteAlternatives(
    request: RouteAlternativesRequest
  ): Promise<RouteAlternativesResponse> {
    try {
      return await apiService.getRouteAlternatives(request);
    } catch (err: any) {
      console.error('Failed to fetch route alternatives:', err);
      throw err;
    }
  }

  /**
   * On-demand safety evaluation for a custom coordinate geometry.
   */
  async assessCustomRouteSafety(payload: any): Promise<any> {
    try {
      return await apiService.assessCustomRouteSafety(payload);
    } catch (err: any) {
      console.error('Failed to assess custom route safety:', err);
      throw err;
    }
  }

  /**
   * Diagnostic details regarding the active backend routing engine.
   */
  async getProviderInfo(): Promise<RouteProviderInfo> {
    try {
      return await apiService.getRoutingProviderInfo();
    } catch (err: any) {
      console.error('Failed to get routing provider info:', err);
      throw err;
    }
  }
}

export const routeService = new RouteService();
export default routeService;
