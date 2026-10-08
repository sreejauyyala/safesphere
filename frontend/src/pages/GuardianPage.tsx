import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Trash2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import type { GuardianData, GuardianRelationship } from '../types';

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

  // Verification
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load active guardian
  useEffect(() => {
    fetchGuardianData();
  }, []);

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

  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName || !guardianPhone) {
      setErrorMsg('Please provide guardian name and contact phone number.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const saved = await apiService.linkGuardian({
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
        guardian_email: guardianEmail.trim() || undefined,
        relationship,
      });
      setGuardian(saved);
      await refreshProfile();
      setSuccessMsg('Guardian details saved successfully! Verification code dispatched.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save guardian details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMsg('Please enter the OTP verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const verified = await apiService.verifyGuardianOTP(otpCode.trim());
      setGuardian(verified);
      await refreshProfile();
      setSuccessMsg('✓ Guardian verified and consent confirmed successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveGuardian = async () => {
    if (!confirm('Are you sure you want to remove this guardian connection?')) return;
    try {
      await apiService.removeMyGuardian();
      setGuardian(null);
      setGuardianName('');
      setGuardianPhone('');
      setGuardianEmail('');
      await refreshProfile();
      setSuccessMsg('Guardian connection removed.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not remove guardian.');
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

  // If adult user:
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-purple-400" />
          Guardian Connect Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Guardian Connect helps keep your trusted guardian informed when SafeSphere safety features are used.
        </p>
      </div>

      {/* Minor Protection Notice Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/30 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-purple-400" />
        <div className="text-xs">
          <span className="font-bold text-purple-200">
            Minor Safeguarding Notice (Age: {userProfile?.age ?? '<18'})
          </span>
          <p className="text-purple-300/80 mt-0.5 leading-relaxed">
            Guardian Connect helps keep your trusted guardian informed when SafeSphere safety features are used. Your guardian will receive alerts if you trigger an emergency SOS or check-in delays occur during future monitored journeys.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Guardian Status Card */}
      {guardian && (
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Primary Guardian Connected
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-1">{guardian.guardian_name}</h2>
              <p className="text-xs text-slate-400">{guardian.relationship} &bull; {guardian.guardian_phone}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
                guardian.verification_status === 'VERIFIED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {guardian.verification_status === 'VERIFIED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {guardian.verification_status}
              </span>
              <button
                type="button"
                onClick={handleRemoveGuardian}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Remove Guardian"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* OTP Verification Form if PENDING */}
          {guardian.verification_status !== 'VERIFIED' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  Guardian Verification Pending
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  Dev OTP: 123456
                </span>
              </div>
              <p className="text-xs text-slate-400">
                A verification code was sent to {guardian.guardian_phone}. Enter it below to confirm guardian consent:
              </p>
              <form onSubmit={handleVerifyOTP} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP (e.g. 123456)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors"
                >
                  {isVerifying ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            </div>
          )}

          {/* Guardian Setup Completed Confirmation */}
          {guardian.verification_status === 'VERIFIED' && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Guardian Setup Completed. Your account is fully protected.</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-medium text-xs flex items-center gap-1"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guardian Details Form (Add or Update) */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-200">
          {guardian ? 'Update Guardian Details' : 'Connect Primary Guardian'}
        </h2>

        <form onSubmit={handleSaveGuardian} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Guardian Full Name</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Guardian Mobile Phone</label>
              <input
                type="tel"
                required
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+1 (555) 345-9876"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Relationship</label>
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
            <label className="block text-xs font-medium text-slate-300 mb-1">Guardian Email (Optional)</label>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="patricia@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving Guardian...' : guardian ? 'Update Guardian Details' : 'Save Guardian & Send Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuardianPage;
