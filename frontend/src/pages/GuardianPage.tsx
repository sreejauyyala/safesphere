import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Phone, 
  Mail, 
  Info, 
  RotateCw,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import type { 
  GuardianData, 
  GuardianRelationship, 
} from '../types';

export const GuardianPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, isMinor, refreshProfile } = useAuth();

  const [guardian, setGuardian] = useState<GuardianData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [relationship, setRelationship] = useState<GuardianRelationship>('Parent');

  // Action states
  const [isSaving, setIsSaving] = useState(false);

  // Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const maskPhone = (phone?: string): string => {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return phone;
    const last4 = digits.slice(-4);
    const prefix = phone.startsWith('+91') ? '+91' : phone.startsWith('+') ? phone.slice(0, 3) : '+91';
    return `${prefix} ******${last4}`;
  };

  const maskEmail = (email?: string): string => {
    if (!email || !email.includes('@')) return 'Unknown';
    const [local, domain] = email.split('@');
    return `${local[0]}******@${domain}`;
  };

  const formatUserFacingError = (err: any): string => {
    const status = err?.status;
    const rawMsg = String(err?.message || err || '').trim();
    const lower = rawMsg.toLowerCase();

    if (status === 404) {
      if (lower.includes('no guardian')) {
        return 'No guardian linked to this minor account. Add guardian details first.';
      }
      if (lower.includes('user profile not found')) {
        return 'SafeSphere user profile not found. Complete user registration first.';
      }
    }

    if (status === 422 || lower.includes('phone') || lower.includes('email') || lower.includes('format')) {
      if (lower.includes('email')) {
        return 'Please enter a valid guardian email address.';
      }
      return 'Please enter a valid guardian phone number.';
    }

    if (lower.includes('self') || lower.includes('own phone') || lower.includes('own email')) {
      return rawMsg;
    }

    if (status === 401 || lower.includes('authentication required')) {
      return 'Authentication required. Please sign in again.';
    }

    return rawMsg || 'Could not save guardian details. Please try again.';
  };

  const fetchGuardianData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getMyGuardian();
      setGuardian(data);
      setGuardianName(data.guardian_name);
      setGuardianPhone(data.guardian_phone);
      setGuardianEmail(data.guardian_email || '');
      setRelationship(data.relationship);
    } catch {
      setGuardian(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardianData();
  }, []);

  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) {
      setErrorMsg('Please provide guardian name and contact phone number.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let saved: GuardianData;
      if (guardian) {
        // Update existing guardian
        saved = await apiService.updateMyGuardian({
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          guardian_email: guardianEmail.trim() || undefined,
          relationship,
        });
      } else {
        // Create new guardian connection
        saved = await apiService.linkGuardian({
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          guardian_email: guardianEmail.trim() || undefined,
          relationship,
        });
      }

      setGuardian(saved);
      setGuardianName(saved.guardian_name);
      setGuardianPhone(saved.guardian_phone);
      setGuardianEmail(saved.guardian_email || '');
      setRelationship(saved.relationship);

      await refreshProfile();
      setSuccessMsg('Guardian details saved successfully.');
    } catch (err: any) {
      setErrorMsg(formatUserFacingError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveGuardian = async () => {
    if (!confirm('Are you sure you want to remove this guardian connection?')) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiService.removeMyGuardian();
      setGuardian(null);
      setGuardianName('');
      setGuardianPhone('');
      setGuardianEmail('');
      setRelationship('Parent');
      await refreshProfile();
      setSuccessMsg('Guardian connection removed successfully.');
    } catch (err: any) {
      setErrorMsg(formatUserFacingError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <span>Loading Guardian Connect...</span>
      </div>
    );
  }

  // Adult user view
  if (!isMinor && userProfile) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl glass-panel border border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Guardian Connect Optional</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Your account is registered as an <strong>Adult (Age: {userProfile.age})</strong>. Mandatory guardian oversight is not required for your SafeSphere account.
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold"
          >
            Go to Home
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white text-xs font-semibold shadow glow-rose"
          >
            View Profile
          </button>
        </div>
      </div>
    );
  }

  const maskedPhone = guardian?.masked_phone || maskPhone(guardian?.guardian_phone) || '';
  const maskedEmail = guardian?.masked_email || (guardian?.guardian_email ? maskEmail(guardian.guardian_email) : '');

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-purple-400" />
          Guardian Connect
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Add your parent or legal guardian's details to your SafeSphere account.
        </p>
      </div>

      {/* Minor Safeguarding Notice Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/30 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-purple-400" />
        <div className="text-xs">
          <span className="font-bold text-purple-200">
            Minor Safeguarding Notice (Age: {userProfile?.age ?? '<18'})
          </span>
          <p className="text-purple-300/80 mt-0.5 leading-relaxed">
            SafeSphere links emergency contacts for minor members. Your guardian is registered as your primary contact when safety features or emergency alerts are engaged.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Guardian Card (if saved) */}
      {guardian && (
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Primary Guardian
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {guardian.verification_status === 'VERIFIED' ? 'VERIFIED' : 'NOT_VERIFIED'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1.5 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                {guardian.guardian_name}
              </h2>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span>{guardian.relationship}</span>
                <span>&bull;</span>
                <span className="font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {maskedPhone}
                </span>
                {guardian.guardian_email && (
                  <>
                    <span>&bull;</span>
                    <span className="font-mono flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {maskedEmail}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveGuardian}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Remove Guardian Connection"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Guardian</span>
            </button>
          </div>

          {/* Contact Verification Status Information Note */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-200 block">
                Guardian details saved — contact verification is not enabled.
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Saving guardian details links emergency contact records. Protected guardian notifications and safety oversight remain subject to authorization and guardian consent rules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Guardian Details Form (Add or Update) */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-200">
            {guardian ? 'Update Guardian Details' : 'Add Guardian Details'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {guardian 
              ? 'Modify your connected parent or guardian contact information below.' 
              : 'Add your parent or legal guardian to connect them to your SafeSphere account.'}
          </p>
        </div>

        <form onSubmit={handleSaveGuardian} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Guardian Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="e.g. Patricia Miller"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Guardian Mobile Phone <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+91 98765 43210 or +1 (555) 234-5678"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                International E.164 or Indian 10-digit mobile format
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Relationship <span className="text-rose-400">*</span>
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as GuardianRelationship)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="Parent">Parent</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Legal Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Guardian Email (Optional)
            </label>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="patricia@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving Guardian Details...</span>
                </>
              ) : guardian ? (
                'Update Guardian Details'
              ) : (
                'Save Guardian Details'
              )}
            </button>
            {guardian && (
              <button
                type="button"
                onClick={handleRemoveGuardian}
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Guardian</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuardianPage;
