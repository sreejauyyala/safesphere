import React from 'react';
import { User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6 text-rose-500" />
          User Profile & Security
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal safety profile, organization affiliation, and credentials.
        </p>
      </div>

      <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            JD
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Jane Doe</h2>
            <p className="text-xs text-slate-400">Community Safety Member &bull; Shift Worker</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Account Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Email Address</span>
            <span className="text-slate-200 font-medium">jane.doe@university.edu</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Emergency Phone</span>
            <span className="text-slate-200 font-medium">+1 (555) 019-2834</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Community Trust Score</span>
            <span className="text-indigo-400 font-bold">98 / 100</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Organization</span>
            <span className="text-slate-200 font-medium">City Tech Campus</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
