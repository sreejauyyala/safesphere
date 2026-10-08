/**
 * SafeSphere Geolocation Service
 * Provides wrapper around browser/device Geolocation API with robust error handling,
 * accuracy filtering, and watchers for live journey tracking.
 */
import type { LocationCoordinates } from '../types';

export interface LocationErrorDetail {
  code: number;
  message: string;
  userFriendlyMessage: string;
}

export class LocationService {
  /**
   * Check if the device / browser supports Geolocation API.
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Formats a GeolocationPositionError into a user-friendly message.
   */
  public static formatError(error: GeolocationPositionError): LocationErrorDetail {
    let friendlyMessage = 'Unable to determine your location. Please try again.';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        friendlyMessage =
          'Location access is disabled. Please enable location permission in your browser or device settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        friendlyMessage =
          'GPS location is currently unavailable. Please ensure your device has GPS or network location enabled.';
        break;
      case error.TIMEOUT:
        friendlyMessage =
          'Location request timed out. Please check your signal and try again.';
        break;
      default:
        friendlyMessage = error.message || 'An unexpected error occurred while fetching your location.';
        break;
    }

    return {
      code: error.code,
      message: error.message,
      userFriendlyMessage: friendlyMessage,
    };
  }

  /**
   * Retrieves single current GPS location position.
   */
  public static getCurrentLocation(
    options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    }
  ): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject({
          code: 0,
          message: 'Geolocation not supported',
          userFriendlyMessage: 'Geolocation is not supported by your current browser or device.',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp || Date.now(),
          });
        },
        (error) => {
          reject(this.formatError(error));
        },
        options
      );
    });
  }

  /**
   * Starts continuous foreground location watching.
   */
  public static watchLocation(
    onSuccess: (coord: LocationCoordinates) => void,
    onError: (err: LocationErrorDetail) => void,
    options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000,
    }
  ): number | null {
    if (!this.isSupported()) {
      onError({
        code: 0,
        message: 'Geolocation not supported',
        userFriendlyMessage: 'Geolocation is not supported by your current browser or device.',
      });
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(),
        });
      },
      (error) => {
        onError(this.formatError(error));
      },
      options
    );
  }

  /**
   * Clears an active geolocation watcher.
   */
  public static stopWatchingLocation(watchId: number | null): void {
    if (watchId !== null && this.isSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Checks current permission status without prompting, if supported.
   */
  public static async checkPermissionStatus(): Promise<PermissionState | 'unsupported'> {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return status.state;
      } catch {
        return 'unsupported';
      }
    }
    return 'unsupported';
  }
}
