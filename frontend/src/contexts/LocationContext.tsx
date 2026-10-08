import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { LocationCoordinates, GeolocationPermissionState } from '../types';
import { LocationService, type LocationErrorDetail } from '../services/locationService';
import apiService from '../services/api';

interface LocationContextType {
  currentLocation: LocationCoordinates | null;
  accuracy: number | null;
  isLocationEnabled: boolean;
  permissionStatus: GeolocationPermissionState;
  isTracking: boolean;
  error: string | null;
  permissionModalOpen: boolean;
  setPermissionModalOpen: (open: boolean) => void;
  requestLocation: () => Promise<LocationCoordinates | null>;
  startLocationTracking: (journeyId?: string) => void;
  stopLocationTracking: () => void;
  activeJourneyId: string | null;
  setActiveJourneyId: (id: string | null) => void;
  clearError: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Default fallback coordinates (e.g. Bangalore center) for testing/initial view if needed
export const DEFAULT_COORDINATES: LocationCoordinates = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 15,
  timestamp: Date.now(),
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<GeolocationPermissionState>('prompt');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState<boolean>(false);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastRecordedPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const activeJourneyIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for callback closures
  useEffect(() => {
    activeJourneyIdRef.current = activeJourneyId;
  }, [activeJourneyId]);

  // Initial permission check on mount
  useEffect(() => {
    LocationService.checkPermissionStatus().then((status) => {
      if (status === 'granted') {
        setPermissionStatus('granted');
        // Fetch location once quietly if permission is already granted
        LocationService.getCurrentLocation()
          .then((coords) => {
            setCurrentLocation(coords);
            setAccuracy(coords.accuracy || null);
            setError(null);
          })
          .catch(() => {
            // Silently ignore initial background failure
          });
      } else if (status === 'denied') {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('prompt');
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        LocationService.stopWatchingLocation(watchIdRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Request single location check with permission handling
   */
  const requestLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    clearError();
    try {
      const coords = await LocationService.getCurrentLocation();
      setCurrentLocation(coords);
      setAccuracy(coords.accuracy || null);
      setPermissionStatus('granted');
      return coords;
    } catch (err: any) {
      const errDetail = err as LocationErrorDetail;
      if (errDetail.code === 1) {
        setPermissionStatus('denied');
      } else if (errDetail.code === 2) {
        setPermissionStatus('unavailable');
      }
      setError(errDetail.userFriendlyMessage || 'Unable to retrieve location.');
      return null;
    }
  }, [clearError]);

  /**
   * Distance calculation helper to avoid redundant backend calls
   */
  const isSignificantMovement = (newLat: number, newLng: number): boolean => {
    if (!lastRecordedPointRef.current) return true;
    const now = Date.now();
    const timeDiff = (now - lastRecordedPointRef.current.time) / 1000;

    // Haversine approximate distance in meters
    const R = 6371e3;
    const φ1 = (lastRecordedPointRef.current.lat * Math.PI) / 180;
    const φ2 = (newLat * Math.PI) / 180;
    const Δφ = ((newLat - lastRecordedPointRef.current.lat) * Math.PI) / 180;
    const Δλ = ((newLng - lastRecordedPointRef.current.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = R * c;

    // Send if moved at least 5 meters or if at least 15 seconds have passed
    return distMeters >= 5 || timeDiff >= 15;
  };

  /**
   * Start live GPS watcher (used explicitly during journey tracking)
   */
  const startLocationTracking = useCallback(
    (journeyId?: string) => {
      if (journeyId) {
        setActiveJourneyId(journeyId);
        activeJourneyIdRef.current = journeyId;
      }

      if (watchIdRef.current !== null) {
        LocationService.stopWatchingLocation(watchIdRef.current);
      }

      setIsTracking(true);
      setError(null);

      const id = LocationService.watchLocation(
        async (coords) => {
          setCurrentLocation(coords);
          setAccuracy(coords.accuracy || null);
          setPermissionStatus('granted');

          // If tracking an active journey, push updates to backend with throttle
          const currentJourneyId = activeJourneyIdRef.current;
          if (currentJourneyId && isSignificantMovement(coords.latitude, coords.longitude)) {
            try {
              lastRecordedPointRef.current = {
                lat: coords.latitude,
                lng: coords.longitude,
                time: Date.now(),
              };
              await apiService.recordJourneyLocation(currentJourneyId, {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy || undefined,
              });
            } catch (postErr) {
              // Log silently to prevent interrupting UI experience
              console.warn('Location point sync pending:', postErr);
            }
          }
        },
        (err) => {
          if (err.code === 1) {
            setPermissionStatus('denied');
          }
          setError(err.userFriendlyMessage);
        }
      );

      watchIdRef.current = id;
    },
    []
  );

  /**
   * Stop live GPS watcher
   */
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      LocationService.stopWatchingLocation(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    lastRecordedPointRef.current = null;
  }, []);

  const value: LocationContextType = {
    currentLocation,
    accuracy,
    isLocationEnabled: permissionStatus === 'granted' && currentLocation !== null,
    permissionStatus,
    isTracking,
    error,
    permissionModalOpen,
    setPermissionModalOpen,
    requestLocation,
    startLocationTracking,
    stopLocationTracking,
    activeJourneyId,
    setActiveJourneyId,
    clearError,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
