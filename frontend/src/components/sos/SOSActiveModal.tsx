import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  MapPin,
  Clock,
  PhoneCall,
  ShieldCheck,
  AlertTriangle,
  Users,
  Navigation,
  ExternalLink,
  Radio,
} from 'lucide-react';
import type { SOSSession } from '../../types';

interface SOSActiveModalProps {
  session: SOSSession;
  onEndClick: () => void;
}

export const SOSActiveModal: React.FC<SOSActiveModalProps> = ({
  session,
  onEndClick,
}) => {
  const navigate = useNavigate();

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'Pending';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const hasUnconfiguredProvider =
    session.provider_configured === false ||
    session.notifications.some((n) => n.delivery_status === 'NOT_CONFIGURED');

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 border-2 border-red-500/60 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-wider animate-pulse">
            <Flame className="w-4 h-4 text-red-500 animate-ping" />
            <span>SOS ACTIVE &bull; EMERGENCY VIGILANCE ENGAGED</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Emergency Siren & Tracking Active
          </h2>
          <p className="text-xs text-red-200/90 max-w-xl leading-relaxed">
            SafeSphere has alerted your authorized Trusted Circle and verified guardians. Real-time GPS coordinates are streaming.
          </p>
        </div>

        <button
          type="button"
          onClick={onEndClick}
          className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-xl transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>I'm Safe Now — End SOS</span>
        </button>
      </div>

      {/* Provider Warning Banner if Unconfigured */}
      {hasUnconfiguredProvider && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold">Provider Configuration Warning</strong>
              <span>
                Real SMS or push notification provider is not configured. External notifications cannot be delivered. Alerts are recorded locally.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
            NOT_CONFIGURED
          </span>
        </div>
      )}

      {/* Grid: Location Status & Update Freshness */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Coordinate Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            Current Location
          </span>
          <div className="text-xs font-bold text-white">
            {session.latest_latitude ? (
              <span className="text-red-300 font-mono">
                {session.latest_latitude.toFixed(4)}, {session.latest_longitude?.toFixed(4)}
              </span>
            ) : (
              <span className="text-amber-400">Locating...</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {session.accuracy ? `Accuracy ±${Math.round(session.accuracy)}m` : 'High precision requested'}
          </span>
        </div>

        {/* Timestamp Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Last GPS Update
          </span>
          <div className="text-xs font-bold text-white">
            {formatTime(session.last_location_update || session.activated_at)}
          </div>
          <span className="text-[10px] block">
            {session.is_location_stale ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Location delayed &bull; check signal
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">Live GPS streaming</span>
            )}
          </span>
        </div>

        {/* Guardian Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Guardian Safeguard
          </span>
          <div className="text-xs font-bold text-white">
            {session.guardian_alerted ? (
              <span className="text-purple-300">Guardian Alert Dispatched</span>
            ) : (
              <span className="text-slate-400">Adult Profile / Not required</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {session.guardian_alerted ? 'Verified under-18 protocol' : 'Standard circle dispatch'}
          </span>
        </div>
      </div>

      {/* Scoped Live Location Sharing Session Card */}
      {session.location_sharing_url && session.location_sharing_active !== false && (
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white block">Emergency Live Location Sharing</span>
              <span className="text-[11px] text-slate-300">
                Temporary encrypted tracking link shared with authorized contacts. Revoked automatically when SOS ends.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const fullUrl = `${window.location.origin}${session.location_sharing_url}`;
                navigator.clipboard.writeText(fullUrl);
                alert('Emergency live tracking link copied to clipboard.');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              Copy Link
            </button>
            <a
              href={session.location_sharing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1 transition"
            >
              <span>View Tracker</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Recipient Delivery Status Table */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-400" />
            <span>
              Emergency Alert Delivery Status ({session.recipients_count ?? session.notifications.length} Selected)
            </span>
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">Real-time outbox tracking</span>
        </div>

        {session.notifications.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-1">
            No verified contacts in circle. Alerts will be logged locally.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {session.notifications.map((notif, idx) => (
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
                  {/* Location Sharing status */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    notif.location_shared
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {notif.location_shared ? 'Location Shared' : 'Location Withheld'}
                  </span>

                  {/* Delivery status */}
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

                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatTime(notif.attempted_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/map')}
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg"
        >
          <Navigation className="w-4 h-4 text-blue-400" />
          <span>View Location on Map</span>
        </button>

        <a
          href="tel:112"
          className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xl shadow-red-950/40"
        >
          <PhoneCall className="w-4 h-4 animate-bounce" />
          <span>Call Emergency (112 / 911)</span>
        </a>

        <button
          type="button"
          onClick={onEndClick}
          className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>End SOS Emergency</span>
        </button>
      </div>
    </div>
  );
};

export default SOSActiveModal;
