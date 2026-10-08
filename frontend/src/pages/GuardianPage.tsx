import React from 'react';
import { ShieldAlert, HeartHandshake, CheckCircle2 } from 'lucide-react';

export const GuardianPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-purple-400" />
          Guardian Protection Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Specialized safeguarding layer for minors (under 18) and dependent family members.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-800/30 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-200">Mandatory Minor Protection Protocol</h3>
            <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
              When a user indicates they are under 18 during registration, SafeSphere activates automated guardian synchronization. Guardians receive instant alerts if journeys exceed expected arrival windows by 10 minutes or if SOS is triggered.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Linked Guardians</h3>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              P
            </div>
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">Parent / Guardian: Patricia Miller</h4>
              <p className="text-xs text-slate-400">+1 (555) 345-9876 &bull; Verified Parent</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Guardian
          </span>
        </div>
      </div>
    </div>
  );
};

export default GuardianPage;
