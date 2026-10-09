import React, { useState } from 'react';
import { X, CheckCircle2, KeyRound, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { TrustedContact } from '../../types';

interface ContactVerificationModalProps {
  contact: TrustedContact | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (contactId: string, code: string) => Promise<void>;
  onResend: (contactId: string) => Promise<{ dev_code?: string; delivery_status?: string }>;
}

export const ContactVerificationModal: React.FC<ContactVerificationModalProps> = ({
  contact,
  isOpen,
  onClose,
  onVerify,
  onResend,
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !contact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      await onVerify(contact.id, code.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await onResend(contact.id);
      if (res.dev_code) {
        setMessage(`Development Mock Code: ${res.dev_code} (Status: ${res.delivery_status || 'SIMULATED'})`);
        setCode(res.dev_code);
      } else {
        setMessage(`Verification code resent to ${contact.phone}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Resend failed.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-xl hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Verify Contact</h2>
            <p className="text-xs text-slate-400 font-medium">
              Verify {contact.contact_name || contact.name} ({contact.phone})
            </p>
          </div>
        </div>

        {/* Development Notice */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Contact verification workflow</p>
          <p>
            When no live SMS gateway is configured, test code <strong className="text-amber-400">123456</strong> is accepted in development mode.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 123456"
              className="w-full text-center tracking-widest text-lg font-black px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>Resend Code (Dev Mock)</span>
            </button>
            <button
              type="button"
              onClick={() => setCode('123456')}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-semibold"
            >
              Fill Dev 123456
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactVerificationModal;
