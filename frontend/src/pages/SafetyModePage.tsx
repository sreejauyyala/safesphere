import React, { useState } from 'react';
import { Flame, Radio, Shield, BellRing, HeartPulse } from 'lucide-react';

export const SafetyModePage: React.FC = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center justify-center gap-2">
          <Flame className="w-6 h-6 text-amber-500" />
          Safety Pulse & "I Feel Unsafe" Mode
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Heightened vigilance mode with frequent GPS breadcrumbs, silent watchdog polling, and quick-dispatch triggers.
        </p>
      </div>

      <div className={`p-8 rounded-3xl border transition-all duration-300 ${
        isActive 
          ? 'bg-rose-950/40 border-rose-500/50 glow-rose' 
          : 'glass-panel border-slate-800'
      }`}>
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center font-bold text-sm tracking-wider uppercase shadow-2xl transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white animate-pulse'
                : 'bg-slate-900 border-2 border-slate-700 text-slate-300 hover:border-rose-500 hover:text-white'
            }`}
          >
            <Radio className="w-8 h-8 mb-1" />
            <span>{isActive ? 'Active' : 'Arm Pulse'}</span>
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-100">
          {isActive ? 'Safety Pulse Telemetry Active' : 'Press to Arm Vigilance Protocol'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
          {isActive
            ? 'Live GPS pinging at 15-second intervals. Guardians and Trusted Circle stand on passive alert. If phone is dropped or idle for 3 minutes, automatic check-in prompts.'
            : 'Activates high-frequency telemetry without triggering a loud alarm. Perfect for uncomfortable situations, unlit walks, or isolated transit.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <HeartPulse className="w-5 h-5 text-rose-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">15s Telemetry</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Continuous low-power GPS updates to SafeSphere backend.</p>
        </div>
        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <BellRing className="w-5 h-5 text-amber-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Silent Standby</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Alerts guardians discreetly without audio giveaway.</p>
        </div>
        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <Shield className="w-5 h-5 text-indigo-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">One-Tap Escalate</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Escalate instantly to full community SOS dispatch.</p>
        </div>
      </div>
    </div>
  );
};

export default SafetyModePage;
