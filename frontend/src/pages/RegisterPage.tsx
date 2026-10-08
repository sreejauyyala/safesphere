import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ShieldAlert } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-8 p-8 rounded-2xl glass-panel border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
        <UserPlus className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-center text-slate-100">Create SafeSphere Profile</h2>
      <p className="text-xs text-center text-slate-400 mt-1">
        Includes automatic age-based Guardian Protection for under-18 users
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            disabled
            placeholder="Jane Doe"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
          <input
            type="email"
            disabled
            placeholder="jane@example.com"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Age</label>
          <input
            type="number"
            disabled
            placeholder="17 (Flags Guardian Requirement)"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm focus:outline-none"
          />
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>If under 18, guardian contact verification is required to safeguard emergency trips.</span>
        </div>

        <button
          type="button"
          disabled
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all opacity-80 cursor-not-allowed"
        >
          Register (Step 2 Implementation)
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-indigo-400 hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
