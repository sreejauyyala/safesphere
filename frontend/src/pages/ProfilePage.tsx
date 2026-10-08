import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  ShieldCheck, 
  ShieldAlert, 
  HeartHandshake, 
  Lock, 
  LogOut, 
  Edit3, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  BadgeCheck 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, isMinor, logout, refreshProfile, resetPassword } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!userProfile) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        Loading profile data...
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiService.updateUserProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      await refreshProfile();
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await resetPassword(userProfile.email);
      setSuccessMsg(`Password reset link dispatched to ${userProfile.email}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not initiate password reset.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-rose-500" />
            User Profile & Identity
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal profile, safety classification, and guardian links.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Identity Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {userProfile.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">{userProfile.full_name}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {userProfile.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {userProfile.user_type} &bull; Member since {new Date(userProfile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditing(!isEditing);
              setFullName(userProfile.full_name);
              setPhone(userProfile.phone);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Section 1: Personal Information */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Personal Information</h3>
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Email Address</span>
                <span className="text-slate-200 font-medium">{userProfile.email}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Phone Number</span>
                <span className="text-slate-200 font-medium">{userProfile.phone}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">Date of Birth</span>
                <span className="text-slate-200 font-medium">{userProfile.date_of_birth}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-500 block mb-1">User Classification</span>
                <span className="text-slate-200 font-medium">{userProfile.user_type}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Safety Account */}
        <div className="pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Safety Account & Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block mb-0.5">Account Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {userProfile.is_active ? 'Active & Protected' : 'Suspended'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block mb-0.5">Age Classification</span>
                <span className={`font-bold flex items-center gap-1 ${isMinor ? 'text-purple-400' : 'text-slate-200'}`}>
                  {isMinor ? <ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                  {isMinor ? `Minor (${userProfile.age} yrs)` : `Adult (${userProfile.age} yrs)`}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block mb-0.5">Community Trust Score</span>
                <span className="text-indigo-400 font-bold">100 / 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Guardian Connect (ONLY displayed for users under 18) */}
        {isMinor && (
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4" />
                <span>Guardian Connect</span>
              </h3>
              <Link to="/guardian" className="text-xs text-purple-300 hover:underline">
                Manage Guardian &rarr;
              </Link>
            </div>

            {userProfile.guardian ? (
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-100">{userProfile.guardian.guardian_name}</h4>
                  <p className="text-slate-400 mt-0.5">
                    {userProfile.guardian.relationship} &bull; {userProfile.guardian.guardian_phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    userProfile.guardian.verification_status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {userProfile.guardian.verification_status}
                  </span>
                  <Link
                    to="/guardian"
                    className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                  >
                    Update
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                <span>⚠️ Guardian setup required for minor accounts before starting SafeSphere journeys.</span>
                <Link
                  to="/guardian"
                  className="px-3 py-1 rounded-lg bg-amber-600 text-white font-medium"
                >
                  Setup Now
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Security */}
        <div className="pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Security & Credentials</h3>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
