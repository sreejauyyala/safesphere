import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ShieldAlert, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { UserType } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isMinor, hasGuardian } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      if (isMinor && !hasGuardian) {
        navigate('/guardian', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [isAuthenticated, isMinor, hasGuardian, navigate]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [userType, setUserType] = useState<UserType>('Student');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time age preview from date of birth
  const calculatePreviewAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const previewAge = calculatePreviewAge(dateOfBirth);
  const isPreviewMinor = previewAge !== null && previewAge < 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!fullName || !email || !phone || !password || !confirmPassword || !dateOfBirth) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (previewAge !== null && previewAge < 0) {
      setErrorMsg('Date of birth cannot be in the future.');
      return;
    }

    if (previewAge !== null && previewAge > 120) {
      setErrorMsg('Please enter a realistic date of birth.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        dateOfBirth,
        userType,
      });

      // Navigate to guardian setup if minor, otherwise to home
      if (profile.is_minor) {
        navigate('/guardian', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8 p-8 rounded-3xl glass-panel border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
        <UserPlus className="w-6 h-6" />
      </div>

      <h1 className="text-2xl font-bold text-center text-slate-100 tracking-tight">Create SafeSphere Profile</h1>
      <p className="text-xs text-center text-slate-400 mt-1">
        24/7 Community Safety Network with intelligent guardian protection
      </p>

      {errorMsg && (
        <div className="mt-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 019-2834"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
            <input
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Primary Role / User Type</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as UserType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="Student">Student</option>
              <option value="Employee">Employee</option>
              <option value="General Public">General Public</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Dynamic Age Detection Status Banner */}
        {previewAge !== null && (
          <div className={`p-3.5 rounded-xl border transition-all text-xs ${
            isPreviewMinor
              ? 'bg-purple-950/30 border-purple-800/40 text-purple-300'
              : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300'
          }`}>
            <div className="flex items-start gap-2.5">
              {isPreviewMinor ? (
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-purple-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              )}
              <div>
                <span className="font-bold">
                  Calculated Age: {previewAge} ({isPreviewMinor ? 'Minor Account' : 'Standard Adult Account'})
                </span>
                <p className="mt-1 text-slate-300/80 leading-relaxed">
                  {isPreviewMinor
                    ? 'Guardian Connect helps keep your trusted guardian informed when SafeSphere safety features are used.'
                    : 'Standard account verification ready. No mandatory guardian setup required.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg glow-blue flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-indigo-400 hover:underline font-semibold">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
