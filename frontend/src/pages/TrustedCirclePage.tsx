import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  History,
  HeartHandshake,
  Flame,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import trustedCircleService from '../services/trustedCircleService';
import sosService from '../services/sosService';
import type { TrustedContact, NotificationLog, SOSSession, TrustedContactCreatePayload } from '../types';
import TrustedContactCard from '../components/trusted-circle/TrustedContactCard';
import TrustedContactFormModal from '../components/trusted-circle/TrustedContactFormModal';
import ContactVerificationModal from '../components/trusted-circle/ContactVerificationModal';
import SOSActivationModal from '../components/sos/SOSActivationModal';
import SOSActiveModal from '../components/sos/SOSActiveModal';
import SOSEndModal from '../components/sos/SOSEndModal';

export const TrustedCirclePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, isMinor } = useAuth();
  const { currentLocation, requestLocation } = useLocation();

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOSSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [verifyingContact, setVerifyingContact] = useState<TrustedContact | null>(null);
  const [isSosActivationOpen, setIsSosActivationOpen] = useState(false);
  const [isSosEndOpen, setIsSosEndOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cts, notifs, currSos] = await Promise.all([
        trustedCircleService.getContacts(),
        trustedCircleService.getNotifications(20),
        sosService.getCurrentSOS(),
      ]);
      setContacts(cts);
      setNotifications(notifs);
      setActiveSOS(currSos);
    } catch (err: any) {
      console.error('Failed to load Trusted Circle:', err);
      setError('Unable to load Trusted Circle data. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchParams.get('sos') === 'true' && !isLoading && !activeSOS) {
      setIsSosActivationOpen(true);
    }
  }, [searchParams, isLoading, activeSOS]);

  // Periodic location stream while SOS is active
  useEffect(() => {
    if (!activeSOS || activeSOS.status !== 'ACTIVE') return;

    const intervalId = setInterval(async () => {
      try {
        if (currentLocation?.latitude && currentLocation?.longitude) {
          const updated = await sosService.updateLocation(
            activeSOS.id,
            currentLocation.latitude,
            currentLocation.longitude,
            currentLocation.accuracy ?? undefined
          );
          setActiveSOS(updated);
        }
      } catch (err) {
        console.warn('Periodic SOS location stream failed:', err);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeSOS?.id, activeSOS?.status, currentLocation]);

  // Handle Add Contact
  const handleAddContact = async (payload: TrustedContactCreatePayload) => {
    const newContact = await trustedCircleService.addContact(payload);
    setContacts((prev) => [newContact, ...prev]);
    // Refresh notifications for invitation log
    const notifs = await trustedCircleService.getNotifications(20);
    setNotifications(notifs);
  };

  // Handle Verify Contact
  const handleVerifyContact = async (contactId: string, code: string) => {
    const updated = await trustedCircleService.verifyContact(contactId, code);
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
  };

  // Handle Resend Code
  const handleResendCode = async (contactId: string) => {
    return await trustedCircleService.resendCode(contactId);
  };

  // Handle Delete Contact
  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to remove this trusted contact?')) return;
    try {
      await trustedCircleService.deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove contact.');
    }
  };

  // Handle SOS Activation
  const handleActivateSOS = async (notes?: string) => {
    let loc = currentLocation;
    if (!loc) {
      loc = await requestLocation();
    }
    const session = await sosService.activateSOS({
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      accuracy: loc?.accuracy ?? null,
      emergency_notes: notes,
    });
    setActiveSOS(session);
    // Refresh notifications
    const notifs = await trustedCircleService.getNotifications(20);
    setNotifications(notifs);
  };

  // Handle SOS End
  const handleEndSOS = async (reason: string) => {
    if (!activeSOS) return;
    await sosService.endSOS(activeSOS.id, reason);
    setActiveSOS(null);
    setIsSosEndOpen(false);
    // Refresh notifications
    const notifs = await trustedCircleService.getNotifications(20);
    setNotifications(notifs);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
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
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Trusted Circle & Emergency Shield</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Selected people who receive authorized journey updates and high-priority SOS alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeSOS ? (
            <button
              type="button"
              onClick={() => setIsSosActivationOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/40 transition active:scale-95"
            >
              <Flame className="w-4 h-4 animate-pulse" />
              <span>Emergency SOS</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>SOS ACTIVE</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Active SOS Panel if SOS is currently active */}
      {activeSOS && (
        <SOSActiveModal
          session={activeSOS}
          onEndClick={() => setIsSosEndOpen(true)}
        />
      )}

      {/* Minor Safeguard / Guardian Connect Banner */}
      {isMinor && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Under-18 Guardian Connect Safeguard</h4>
              <p className="text-slate-300 text-[11px] mt-0.5">
                {userProfile?.guardian?.guardian_name ? (
                  <>
                    Primary Guardian: <strong>{userProfile.guardian.guardian_name}</strong> ({userProfile.guardian.relationship}) &bull; Verification:{' '}
                    <span className="text-purple-300 font-bold uppercase">{userProfile.guardian.verification_status}</span>
                  </>
                ) : (
                  'No verified guardian linked yet. Guardian setup is required for under-18 journey monitoring.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/guardian')}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shrink-0"
          >
            Guardian Settings
          </button>
        </div>
      )}

      {/* Contacts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>My Trusted Contacts ({contacts.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">Only verified contacts receive dispatches</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
            <p>Loading your Trusted Circle...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-200 text-base">Your Trusted Circle is Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add family members, roommates, or close friends who should be notified when you start journeys or trigger emergency SOS alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Trusted Contact</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <TrustedContactCard
                key={contact.id}
                contact={contact}
                onVerifyClick={(c) => setVerifyingContact(c)}
                onDeleteClick={handleDeleteContact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notification Outbox History Drawer */}
      {notifications.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Outward Notification Log ({notifications.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">Audit trail of safety alerts</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {notifications.map((notif) => (
              <div key={notif.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {notif.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      &rarr; {notif.recipient_name || 'Contact'} ({notif.recipient_type})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-md">
                    {notif.message_content}
                  </p>
                </div>

                <div className="text-right space-y-0.5 shrink-0 pl-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    notif.delivery_status === 'SENT' || notif.delivery_status === 'DELIVERED'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : notif.delivery_status === 'UNAVAILABLE'
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}>
                    {notif.delivery_status}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(notif.attempted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <TrustedContactFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddContact}
      />

      <ContactVerificationModal
        contact={verifyingContact}
        isOpen={Boolean(verifyingContact)}
        onClose={() => setVerifyingContact(null)}
        onVerify={handleVerifyContact}
        onResend={handleResendCode}
      />

      <SOSActivationModal
        isOpen={isSosActivationOpen}
        onClose={() => setIsSosActivationOpen(false)}
        onConfirm={handleActivateSOS}
        contacts={contacts}
      />

      <SOSEndModal
        isOpen={isSosEndOpen}
        onClose={() => setIsSosEndOpen(false)}
        onConfirm={handleEndSOS}
      />
    </div>
  );
};

export default TrustedCirclePage;
