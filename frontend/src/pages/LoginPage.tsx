import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-2xl glass-panel border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
        <LogIn className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-center text-slate-100">Welcome Back</h2>
      <p className="text-xs text-center text-slate-400 mt-1">
        Access your SafeSphere community guardian portal
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
          <input
            type="email"
            disabled
            placeholder="user@example.com (Firebase Auth - Step 2)"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
          <input
            type="password"
            disabled
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm focus:outline-none"
          />
        </div>

        <button
          type="button"
          disabled
          className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all opacity-80 cursor-not-allowed"
        >
          Sign In (Step 2 Implementation)
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-rose-400 hover:underline font-medium">
          Create SafeSphere ID
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
