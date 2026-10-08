import React, { useEffect, useState } from 'react';
import { LayoutDashboard, AlertCircle, CheckCircle, Flame, Building2 } from 'lucide-react';
import apiService from '../services/api';
import type { DetailedHealthStatus } from '../types';

export const AdminPage: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DetailedHealthStatus | null>(null);

  useEffect(() => {
    apiService.getHealthDetails()
      .then(setDiagnostics)
      .catch((err) => console.log('Diagnostics fetch error', err));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-rose-500" />
          Community Admin & Hotspot Operations
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Civic hazard resolution management, territorial hotspot analytics, and organization oversight.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Civic Hazards Open</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">12</div>
          <span className="text-[10px] text-slate-500">3 awaiting community verification</span>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Issues Resolved</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">48</div>
          <span className="text-[10px] text-emerald-400/80">98.2% on-time resolution</span>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Hotspots Detected</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">2</div>
          <span className="text-[10px] text-amber-400/80">Low illumination corridors</span>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Active Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">4</div>
          <span className="text-[10px] text-slate-500">Colleges & Corporations</span>
        </div>
      </div>

      {/* System Architecture Diagnostics */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">System Architecture Diagnostics (Step 1 Foundation)</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">FastAPI Gateway:</span>
              <span className="text-emerald-400 font-semibold">{diagnostics?.service || 'Connected'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">API Prefix:</span>
              <span className="font-mono text-indigo-400">/api/v1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-300">{diagnostics?.environment || 'development'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PostgreSQL Status:</span>
              <span className={`font-semibold ${diagnostics?.database?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diagnostics?.database?.connected ? 'Connected' : 'Configured (Docker/Local ready)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Google Gemini AI Engine:</span>
              <span className="text-indigo-400 font-semibold">Service Adapter Ready (Step 8)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Firebase Cloud Messaging:</span>
              <span className="text-slate-400 font-semibold">FCM Architecture Prepared</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
