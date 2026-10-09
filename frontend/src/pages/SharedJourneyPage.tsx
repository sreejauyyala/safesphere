import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Shield,
  MapPin,
  Clock,
  Compass,
  AlertTriangle,
  Radio,
  PhoneCall,
  RefreshCw,
  Info,
} from 'lucide-react';
import trustedCircleService from '../services/trustedCircleService';
import type { SharedJourneyPublicResponse } from '../types';

export const SharedJourneyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [journeyData, setJourneyData] = useState<SharedJourneyPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const travelerMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const fetchJourney = useCallback(async (isBackground = false) => {
    if (!token) {
      setError('Invalid sharing link.');
      setLoading(false);
      return;
    }

    if (!isBackground) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await trustedCircleService.getSharedJourney(token);
      setJourneyData(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load shared journey:', err);
      if (err.response?.status === 410) {
        setError('This shared journey link has expired.');
      } else if (err.response?.status === 404) {
        setError('This shared journey link was revoked or does not exist.');
      } else {
        setError(err.response?.data?.detail || 'Unable to load shared journey data.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchJourney(false);
  }, [fetchJourney]);

  // Live polling every 10 seconds if journey is active
  useEffect(() => {
    if (!journeyData || !journeyData.is_active || journeyData.status === 'COMPLETED') {
      return;
    }
    const interval = setInterval(() => {
      fetchJourney(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [journeyData, fetchJourney]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !journeyData) return;

    const lat = journeyData.last_latitude ?? 12.9716;
    const lng = journeyData.last_longitude ?? 77.5946;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.panTo([lat, lng]);
    }

    const map = mapInstanceRef.current;

    // Custom pulsing traveler icon
    const travelerHtml = `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: relative; width: 20px; height: 20px; border-radius: 50%; background-color: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: travelerHtml,
      className: 'custom-traveler-pulse',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (journeyData.last_latitude && journeyData.last_longitude) {
      if (!travelerMarkerRef.current) {
        travelerMarkerRef.current = L.marker([journeyData.last_latitude, journeyData.last_longitude], {
          icon: customIcon,
        })
          .addTo(map)
          .bindPopup(`<b>${journeyData.user_name}</b><br/>Live Location`);
      } else {
        travelerMarkerRef.current.setLatLng([journeyData.last_latitude, journeyData.last_longitude]);
      }
    }

    // Render route geometry if available
    if (journeyData.route_geometry) {
      try {
        let coords: [number, number][] = [];
        const parsed = JSON.parse(journeyData.route_geometry);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (Array.isArray(parsed[0])) {
            coords = parsed.map((p: any) => [Number(p[0]), Number(p[1])]);
          } else if (parsed[0].lat && parsed[0].lng) {
            coords = parsed.map((p: any) => [Number(p.lat), Number(p.lng)]);
          }
        }
        if (coords.length > 0) {
          if (routeLayerRef.current) {
            routeLayerRef.current.setLatLngs(coords);
          } else {
            routeLayerRef.current = L.polyline(coords, {
              color: '#3b82f6',
              weight: 5,
              opacity: 0.8,
              dashArray: '8, 8',
            }).addTo(map);
          }
        }
      } catch (e) {
        console.warn('Could not parse route geometry for shared journey', e);
      }
    }

    return () => {
      // Map cleanup on unmount
    };
  }, [journeyData]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Unavailable';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getMinutesAgo = (isoString?: string | null) => {
    if (!isoString) return null;
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
    if (diff <= 0) return 'Just now';
    if (diff === 1) return '1 min ago';
    return `${diff} mins ago`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">SafeSphere</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase tracking-wider">
                  Live Journey Share
                </span>
              </div>
              <p className="text-xs text-slate-400">Authorized contact live telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchJourney(true)}
              disabled={isRefreshing || loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/home"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Open SafeSphere
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-white">Connecting to SafeSphere Telemetry...</h3>
            <p className="text-xs text-slate-400 mt-1">Verifying encrypted sharing token and GPS stream</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Access Expired or Revoked</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {error}
            </p>
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 text-left mb-6">
              <p className="font-semibold text-slate-200 mb-1">Why am I seeing this?</p>
              <p>
                Live journey links expire automatically after their designated sharing duration, or when the traveler completes or revokes their session for privacy.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20 text-sm"
            >
              Return to SafeSphere
            </Link>
          </div>
        ) : journeyData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Left 2 Cols: Live Map */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Stale Warning Banner if applicable */}
              {journeyData.is_location_stale && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">Location Telemetry Notice:</span> The traveler’s location has not updated recently ({getMinutesAgo(journeyData.last_location_update)}). Displaying the last confirmed position.
                  </div>
                </div>
              )}

              {/* Status Header Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                    {journeyData.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{journeyData.user_name}’s Journey</h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      Destination: <span className="text-slate-200 font-medium">{journeyData.destination_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      journeyData.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : journeyData.status === 'PAUSED'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {journeyData.status === 'ACTIVE' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                    {journeyData.status}
                  </span>
                </div>
              </div>

              {/* Leaflet Map Card */}
              <div className="relative rounded-2xl border border-slate-800 overflow-hidden shadow-2xl h-[420px] md:h-[480px] bg-slate-900">
                <div ref={mapContainerRef} className="w-full h-full z-10" />

                {/* Map Overlay Badge */}
                <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-lg">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Live Sync: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Right Col: Details, Telemetry & Emergency Actions */}
            <div className="space-y-4">
              {/* Telemetry Information Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  Live Journey Metrics
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Distance Travelled</span>
                    <p className="text-lg font-bold text-white mt-0.5">
                      {(journeyData.distance_travelled / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400">km</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Started At</span>
                    <p className="text-sm font-semibold text-white mt-1">
                      {formatTime(journeyData.started_at)}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Last GPS Update:</span>
                    <span className="font-semibold text-white">{formatTime(journeyData.last_location_update)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Update Recency:</span>
                    <span className="font-semibold text-emerald-400">
                      {getMinutesAgo(journeyData.last_location_update) || 'Live'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      {journeyData.last_latitude ? `${journeyData.last_latitude.toFixed(4)}, ${journeyData.last_longitude?.toFixed(4)}` : 'Awaiting GPS'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/30 flex items-start gap-2.5 text-xs text-blue-300">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Link Validity:</span>
                    <p className="text-[11px] text-blue-200/80 mt-0.5">
                      This sharing token will automatically expire on {new Date(journeyData.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts & Protocol Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-rose-400" />
                  Emergency Assistance
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If you are unable to reach {journeyData.user_name} or suspect an emergency situation, contact official emergency services directly:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href="tel:112"
                    className="p-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold text-center text-xs flex items-center justify-center gap-2 transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Dial 112 (National)
                  </a>
                  <a
                    href="tel:911"
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-center text-xs flex items-center justify-center gap-2 transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Dial 911 / Police
                  </a>
                </div>
              </div>

              {/* Security & Privacy Notice */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  SafeSphere Protected Sharing: You are viewing this journey because the traveler authorized live location sharing with you. This link does not grant access to account settings, other contacts, or historical travel logs.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default SharedJourneyPage;
