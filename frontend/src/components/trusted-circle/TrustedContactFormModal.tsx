import React, { useState } from 'react';
import { X, UserPlus, Shield, Check, Loader2, AlertCircle } from 'lucide-react';
import type { TrustedContactCreatePayload, TrustedContactPermissions } from '../../types';

interface TrustedContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: TrustedContactCreatePayload) => Promise<void>;
}

export const TrustedContactFormModal: React.FC<TrustedContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const isEmergencyRecipient = true;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Granular Permissions
  const [permissions, setPermissions] = useState<TrustedContactPermissions>({
    notify_journey_start: true,
    notify_journey_end: true,
    notify_safety_mode: true,
    notify_sos: true,
    share_live_location: true,
    notify_emergency_updates: true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        contact_name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        relationship,
        is_emergency_recipient: isEmergencyRecipient,
        permissions,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to add contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const relationshipOptions = [
    'Friend',
    'Parent',
    'Guardian',
    'Sibling',
    'Spouse',
    'Partner',
    'Roommate',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Add Trusted Contact</h2>
            <p className="text-xs text-slate-400 font-medium">
              Invite a contact to receive authorized journey & emergency safety alerts
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Miller"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 234 5678"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition"
              >
                {relationshipOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          {/* Granular Permission Toggles */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Authorized Safety Permissions</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Control exactly which notifications this contact receives. You can adjust or revoke these anytime.
            </p>

            <div className="space-y-2 pt-1">
              {[
                { key: 'notify_sos', label: 'SOS Emergency Alerts', desc: 'Notify immediately during urgent SOS panic triggers' },
                { key: 'share_live_location', label: 'Live Location Sharing', desc: 'Permit access to real-time travel coordinates' },
                { key: 'notify_safety_mode', label: 'Safety Mode Alerts', desc: 'Notify when discreet "I Feel Unsafe" mode is activated' },
                { key: 'notify_journey_start', label: 'Journey Started', desc: 'Send check-in alert when a journey commences' },
                { key: 'notify_journey_end', label: 'Journey Completed', desc: 'Send safe-arrival alert when journey completes' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permissions[key as keyof TrustedContactPermissions]}
                    onChange={(e) =>
                      setPermissions((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0 bg-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">{label}</span>
                    <span className="text-[10px] text-slate-500 block">{desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding Contact...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrustedContactFormModal;
