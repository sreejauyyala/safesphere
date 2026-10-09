import React from 'react';
import {
  Phone,
  Mail,
  Trash2,
  KeyRound,
  CheckCircle2,
  Navigation,
  Radio,
  Flame,
} from 'lucide-react';
import type { TrustedContact } from '../../types';

interface TrustedContactCardProps {
  contact: TrustedContact;
  onVerifyClick: (contact: TrustedContact) => void;
  onDeleteClick: (contactId: string) => void;
}

export const TrustedContactCard: React.FC<TrustedContactCardProps> = ({
  contact,
  onVerifyClick,
  onDeleteClick,
}) => {
  const isVerified = contact.verification_status === 'VERIFIED';
  const displayName = contact.contact_name || contact.name || 'Trusted Contact';
  const displayPhone = contact.phone || contact.phone_number || '';

  return (
    <div className="p-4 sm:p-5 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
            isVerified
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}>
            {displayName[0]?.toUpperCase() || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm">{displayName}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                {contact.relationship}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{displayPhone}</span>
              </span>
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[150px]">{contact.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {isVerified ? (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>VERIFIED</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onVerifyClick(contact)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>PENDING (Verify)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteClick(contact.id)}
            className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
            title="Remove contact"
            aria-label="Remove contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permissions Badges */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="text-slate-500 font-semibold uppercase tracking-wider mr-1 text-[9px]">
          Permissions:
        </span>
        {contact.permissions?.notify_sos && (
          <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-semibold flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-red-400" />
            SOS Alerts
          </span>
        )}
        {contact.permissions?.share_live_location && (
          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold flex items-center gap-1">
            <Navigation className="w-2.5 h-2.5 text-indigo-400" />
            Live Tracking
          </span>
        )}
        {contact.permissions?.notify_safety_mode && (
          <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-rose-400" />
            Safety Mode
          </span>
        )}
        {contact.permissions?.notify_journey_start && (
          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
            Journey Start
          </span>
        )}
        {contact.permissions?.notify_journey_end && (
          <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
            Journey End
          </span>
        )}
      </div>
    </div>
  );
};

export default TrustedContactCard;
