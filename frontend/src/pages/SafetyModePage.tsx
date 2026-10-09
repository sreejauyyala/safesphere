import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  MapPin,
  Route,
  BellRing,
  ArrowLeft,
  Navigation,
  AlertTriangle,
  History,
  PhoneCall,
  ExternalLink,
  Loader2,
  Users,
} from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import safetyModeService from '../services/safetyModeService';
import type {
  SafetyModeActiveDetailResponse,
  SafetyModeSession,
} from '../types';
import SafetyModeActivationModal from '../components/safety-mode/SafetyModeActivationModal';
import SafetyModeEndModal from '../components/safety-mode/SafetyModeEndModal';
import NearbyHelpPointsList from '../components/safety-mode/NearbyHelpPointsList';
import SafetyModeRouteReviewModal from '../components/safety-mode/SafetyModeRouteReviewModal';

export const SafetyModePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLocation, requestLocation } = useLocation();
  const { userProfile } = useAuth();

  const [activeDetail, setActiveDetail] = useState<SafetyModeActiveDetailResponse | null>(null);
  const [historySessions, setHistorySessions] = useState<SafetyModeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isRouteReviewOpen, setIsRouteReviewOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sosNotice, setSosNotice] = useState<string | null>(null);

  const isSessionActive = Boolean(activeDetail?.session && activeDetail.session.status === 'ACTIVE');

  // 1. Fetch Current Safety Mode Status & Assistance
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await safetyModeService.getCurrent(
        currentLocation?.latitude,
        currentLocation?.longitude
      );
      setActiveDetail(data);

      const history = await safetyModeService.getHistory(15);
      setHistorySessions(history);
    } catch (err: any) {
      console.error('Failed to load safety mode data:', err);
      setErrorMsg('Unable to synchronize Safety Mode status. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-open activation modal if ?activate=true passed
  useEffect(() => {
    if (searchParams.get('activate') === 'true' && !isLoading && !isSessionActive) {
      setIsActivationOpen(true);
    }
  }, [searchParams, isLoading, isSessionActive]);

  // Handle Activation Confirm
  const handleActivate = async (payload: { notifyTrustedContacts: boolean; userNote?: string }) => {
    setIsActivating(true);
    setErrorMsg(null);
    try {
      let loc = currentLocation;
      if (!loc) {
        loc = await requestLocation();
      }

      const res = await safetyModeService.activate({
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        notify_trusted_contacts: payload.notifyTrustedContacts,
        user_note: payload.userNote,
      });

      setActiveDetail(res);
      setIsActivationOpen(false);
    } catch (err: any) {
      console.error('Safety mode activation failed:', err);
      setErrorMsg(err.message || 'Failed to activate Safety Mode.');
    } finally {
      setIsActivating(false);
    }
  };

  // Handle Deactivation Confirm
  const handleEnd = async (payload: { deactivationReason: string; userNote?: string }) => {
    if (!activeDetail) return;
    setIsEnding(true);
    setErrorMsg(null);
    try {
      await safetyModeService.endSession(activeDetail.session.id, {
        deactivation_reason: payload.deactivationReason,
        user_note: payload.userNote,
        send_safe_confirmation_update: true,
      });

      setActiveDetail(null);
      setIsEndOpen(false);
      // Refresh history
      const history = await safetyModeService.getHistory(15);
      setHistorySessions(history);
    } catch (err: any) {
      console.error('Ending safety mode failed:', err);
      setErrorMsg(err.message || 'Failed to end Safety Mode.');
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header / Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-900">
        <div>
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home Dashboard</span>
          </button>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>"I Feel Unsafe" &bull; Preventive Safety Assistance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Step 11 preventive vigilance &bull; Nearby verified safe havens &bull; Discreet monitoring
          </p>
        </div>

        {isSessionActive && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>SAFETY MODE ACTIVE</span>
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs text-rose-400 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Emergency SOS Quick Notice Modal */}
      {sosNotice && (
        <div className="p-4 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5 text-red-400 animate-bounce" />
            <div>
              <strong className="block text-white font-bold">Emergency SOS Notice</strong>
              <span>{sosNotice}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSosNotice(null)}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] hover:bg-red-500"
          >
            OK
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="p-12 text-center text-xs text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
          <p>Syncing SafeSphere Safety Mode telemetry...</p>
        </div>
      )}

      {/* VIEW 1: ACTIVE SAFETY MODE INTERFACE */}
      {!isLoading && isSessionActive && activeDetail && (
        <div className="space-y-6">
          {/* Main Active Banner Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border border-rose-500/40 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <Radio className="w-3.5 h-3.5 animate-ping text-rose-400" />
                    <span>Watchdog Telemetry Engaged</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Your Preventive Safety Support is Active
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    SafeSphere is actively monitoring your position. Nearby verified havens, alternate routes, and discreet assistance tools are standing by.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEndOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>I'm Safe Now — End Safety Mode</span>
                </button>
              </div>

              {/* Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* Location Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    GPS Location
                  </span>
                  <div className="text-xs font-bold text-white">
                    {activeDetail.location_status === 'available' ? (
                      <span className="text-emerald-300">
                        {currentLocation
                          ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                          : activeDetail.session.last_latitude
                          ? `${activeDetail.session.last_latitude.toFixed(4)}, ${activeDetail.session.last_longitude?.toFixed(4)}`
                          : 'Location Available'}
                      </span>
                    ) : (
                      <span className="text-amber-400">Permission Required</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {activeDetail.location_status === 'available'
                      ? currentLocation?.accuracy
                        ? `Precision: ±${Math.round(currentLocation.accuracy)}m`
                        : 'Precision active'
                      : 'Enable browser GPS for closest safe havens'}
                  </span>
                </div>

                {/* Journey Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Route className="w-3 h-3 text-indigo-400" />
                    Linked Journey
                  </span>
                  <div className="text-xs font-bold text-white truncate">
                    {activeDetail.journey_destination ? activeDetail.journey_destination : 'Standalone Navigation Mode'}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {activeDetail.journey_status ? `Journey Status: ${activeDetail.journey_status}` : 'No active trip linked'}
                  </span>
                </div>

                {/* Notification Status Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <BellRing className="w-3 h-3 text-rose-400" />
                    Notification Status
                  </span>
                  <div className="text-xs font-bold text-white truncate">
                    {activeDetail.session.notification_status === 'SENT' ? (
                      <span className="text-emerald-400">Dispatched ({activeDetail.recipients_count ?? activeDetail.notifications?.length ?? 0} Recipients)</span>
                    ) : activeDetail.session.notification_status === 'NOT_CONFIGURED' ? (
                      <span className="text-amber-400">Provider Not Configured</span>
                    ) : activeDetail.session.notification_status === 'FAILED' ? (
                      <span className="text-rose-400">Delivery Failed</span>
                    ) : (
                      <span className="text-slate-400">{activeDetail.session.notification_status}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {activeDetail.notification_message}
                  </span>
                </div>
              </div>

              {/* Provider Warning Banner if Not Configured */}
              {(!activeDetail.provider_configured || activeDetail.session.notification_status === 'NOT_CONFIGURED') && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Provider Notice:</strong> Real SMS / push notification provider is not configured. External notifications are not dispatched.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold shrink-0">
                    NOT_CONFIGURED
                  </span>
                </div>
              )}

              {/* Live Journey Sharing Link Card */}
              {activeDetail.location_sharing_url && (
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Protected Journey Live Link</span>
                      <span className="text-[11px] text-slate-400">
                        Scoped strictly to contacts authorized for live location.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const fullUrl = `${window.location.origin}${activeDetail.location_sharing_url}`;
                        navigator.clipboard.writeText(fullUrl);
                        alert('Live journey sharing link copied to clipboard.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold transition"
                    >
                      Copy Link
                    </button>
                    <a
                      href={activeDetail.location_sharing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <span>Open View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Recipient Notification Status Outbox */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-400" />
                    <span>
                      Trusted Circle Notifications ({activeDetail.recipients_count ?? activeDetail.notifications?.length ?? 0} Selected)
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">Status per Recipient</span>
                </div>

                {(!activeDetail.notifications || activeDetail.notifications.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-1">
                    No verified contacts or guardians configured for Safety Mode notifications.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {activeDetail.notifications.map((notif, idx) => (
                      <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{notif.recipient_name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase">
                              {notif.recipient_type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              [{notif.channel}]
                            </span>
                          </div>
                          {notif.error_message && (
                            <span className="text-[11px] text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {notif.error_message}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            notif.location_shared
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {notif.location_shared ? 'Location Shared' : 'Location Withheld'}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            notif.delivery_status === 'DELIVERED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : notif.delivery_status === 'SENT'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : notif.delivery_status === 'NOT_CONFIGURED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : notif.delivery_status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {notif.delivery_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Matrix for Active Safety Mode */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white">View Safety Map</h4>
                <p className="text-[10px] text-slate-500">Live 3D navigation & route</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('nearby-help-points-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white">Find Nearby Help</h4>
                <p className="text-[10px] text-slate-500">Verified safe havens</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsRouteReviewOpen(true)}
              className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white">Review Routes</h4>
                <p className="text-[10px] text-slate-500">Lower-risk corridors</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/trusted-circle')}
              className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white">Manage Circle</h4>
                <p className="text-[10px] text-slate-500">Trusted contacts</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/trusted-circle?sos=true');
              }}
              className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 hover:border-red-400 transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center group-hover:scale-105 transition">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-200 group-hover:text-white">Emergency SOS</h4>
                <p className="text-[10px] text-red-300/80">Immediate siren dispatch</p>
              </div>
            </button>
          </div>

          {/* Guardian Protection Details (For Minor Users) */}
          {userProfile?.is_minor && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Minor Account Guardian Shield</span>
                  <span className="text-[11px] text-slate-400">
                    {activeDetail.guardian_status.has_guardian
                      ? `Linked Guardian: ${activeDetail.guardian_status.guardian_name} (${activeDetail.guardian_status.relationship}) • Status: ${activeDetail.guardian_status.verification_status}`
                      : 'No verified guardian linked yet.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/guardian')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline shrink-0"
              >
                Guardian Settings
              </button>
            </div>
          )}

          {/* Section: Nearby Verified Safe Havens */}
          <div id="nearby-help-points-section" className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Nearby Verified Safe Havens</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Physically verified 24/7 havens within 10 km sorted by ground distance
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/map')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
              >
                <span>Full Map</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <NearbyHelpPointsList
              helpPoints={activeDetail.nearby_help_points || []}
              isLoading={false}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: INACTIVE SAFETY MODE — ACTIVATION HERO & OVERVIEW */}
      {!isLoading && !isSessionActive && (
        <div className="space-y-6">
          {/* Main Activation Hero */}
          <div className="p-8 sm:p-10 rounded-3xl glass-panel border border-slate-800 text-center space-y-6 relative overflow-hidden">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-2xl">
                <ShieldAlert className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Discreet Preventive Safety Assistance
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Feel uncomfortable or concerned during a journey? Activate Safety Mode to engage background watchdog monitoring, locate vetted safe havens, and reassess routes without sounding a loud alarm.
              </p>
            </div>

            {/* Big Activation CTA Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsActivationOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm tracking-wider uppercase shadow-2xl shadow-rose-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Radio className="w-5 h-5 animate-ping text-white" />
                <span>I Feel Unsafe &bull; Activate Safety Mode</span>
              </button>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 max-w-md mx-auto">
              SafeSphere does not broadcast your location publicly or call emergency responders automatically. SOS is reserved as a separate action.
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white">Verified Safe Havens</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Instant radar of vetted 24/7 havens, police stations, and campus security posts near your current coordinate.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Route className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white">Route Reassessment</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Step 10 safety-aware route recalculation to guide you away from reported dark spots and isolated corridors.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white">Passive Circle Alert</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Optionally notify chosen emergency contacts and verified guardians that you are on heightened alert.
              </p>
            </div>
          </div>

          {/* Historical Sessions Drawer */}
          {historySessions.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Past Safety Mode Sessions ({historySessions.length})</span>
                </h3>
                <span className="text-[11px] text-slate-500">Private audit log</span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {historySessions.slice(0, 5).map((sess) => (
                  <div key={sess.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">
                          {new Date(sess.activated_at).toLocaleString()}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase">
                          {sess.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Reason: {sess.deactivation_reason || 'Normal completion'}
                        {sess.user_note ? ` &bull; "${sess.user_note}"` : ''}
                      </p>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      {sess.deactivated_at
                        ? `${Math.round(
                            (new Date(sess.deactivated_at).getTime() - new Date(sess.activated_at).getTime()) / 60000
                          )} min duration`
                        : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activation Modal */}
      <SafetyModeActivationModal
        isOpen={isActivationOpen}
        onClose={() => setIsActivationOpen(false)}
        onConfirm={handleActivate}
        currentLocation={currentLocation}
        activeJourneyDestination={activeDetail?.journey_destination}
        isStarting={isActivating}
      />

      {/* End Safety Mode Modal */}
      <SafetyModeEndModal
        isOpen={isEndOpen}
        onClose={() => setIsEndOpen(false)}
        onConfirm={handleEnd}
        isEnding={isEnding}
      />

      {/* Route Review Modal */}
      <SafetyModeRouteReviewModal
        isOpen={isRouteReviewOpen}
        onClose={() => setIsRouteReviewOpen(false)}
        originLat={currentLocation?.latitude || activeDetail?.session.last_latitude}
        originLon={currentLocation?.longitude || activeDetail?.session.last_longitude}
        destLat={activeDetail?.journey_destination ? currentLocation?.latitude : null}
        destLon={activeDetail?.journey_destination ? currentLocation?.longitude : null}
      />
    </div>
  );
};

export default SafetyModePage;
