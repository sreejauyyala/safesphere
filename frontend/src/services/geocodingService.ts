/**
 * SafeSphere Geocoding Service
 * Provides address and place searching using OpenStreetMap Nominatim API
 * with debouncing, timeouts, and fallback options.
 */
import type { SearchResultLocation } from '../types';

export class GeocodingService {
  private static cache = new Map<string, SearchResultLocation[]>();

  /**
   * Search for locations matching query.
   */
  public static async searchLocation(query: string): Promise<SearchResultLocation[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const cacheKey = trimmed.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          // Polite user-agent identifying the SafeSphere hackathon app
          'User-Agent': 'SafeSphere-Community-Safety-Network/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      const results: SearchResultLocation[] = data.map((item: any) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (err: any) {
      console.warn('Nominatim online geocoding unavailable or timed out, checking fallback:', err);
      // Fallback local matching for common demo locations
      return this.localFallbackSearch(trimmed);
    }
  }

  /**
   * Reverse geocodes coordinates to a short human-readable address label.
   */
  public static async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'SafeSphere-Community-Safety-Network/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          return parts.slice(0, 3).join(',').trim();
        }
      }
    } catch {
      // Fallback
    }
    return `Location near ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  /**
   * Safe local fallback search in case Nominatim is rate-limited or offline
   */
  private static localFallbackSearch(query: string): SearchResultLocation[] {
    const lower = query.toLowerCase();
    const commonPlaces: SearchResultLocation[] = [
      {
        name: 'Residency Road',
        displayName: 'Residency Road, Central District, Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
      },
      {
        name: 'Brigade Road Junction',
        displayName: 'Brigade Road, Commercial Shopping Hub, Bengaluru',
        latitude: 12.9745,
        longitude: 77.6075,
      },
      {
        name: 'MG Road Metro Station',
        displayName: 'Mahatma Gandhi Road Metro Transit Hub, Bengaluru',
        latitude: 12.9755,
        longitude: 77.6065,
      },
      {
        name: 'Victoria Hospital Emergency',
        displayName: 'Victoria Hospital Campus, Fort Road, Bengaluru',
        latitude: 12.9640,
        longitude: 77.5750,
      },
      {
        name: 'Ashok Nagar Police Station',
        displayName: 'Ashok Nagar Police Station & Women Assistance Cell, Bengaluru',
        latitude: 12.9710,
        longitude: 77.6030,
      },
      {
        name: 'Central University Campus',
        displayName: 'Central College Campus Gate 1, Bengaluru',
        latitude: 12.9770,
        longitude: 77.5850,
      },
      {
        name: 'Electronic City Tech Hub',
        displayName: 'Electronic City Phase 1 Transit Corridor, Bengaluru',
        latitude: 12.8399,
        longitude: 77.6770,
      },
    ];

    return commonPlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.displayName.toLowerCase().includes(lower)
    );
  }
}

export default GeocodingService;
