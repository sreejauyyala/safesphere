import React, { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import type { AdministrativeAuditLog } from '../../types';
import adminService from '../../services/adminService';

export const AdminAuditHistoryView: React.FC = () => {
  const [logs, setLogs] = useState<AdministrativeAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAuditLogs(50);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Administrative Audit History & Moderation Log
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable chain-of-custody recording every report moderation, work order delegation, and resolution event.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Actor / Admin</th>
                <th className="py-3 px-3">Action Type</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-3">Status Transition</th>
                <th className="py-3 px-4">Recorded Reason / Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No administrative audit actions recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionColor =
                    log.action_type.includes('VERIF')
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : log.action_type.includes('REJECT')
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : log.action_type.includes('ASSIGN')
                      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                      : log.action_type.includes('RESOLV')
                      ? 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                      : 'text-slate-400 bg-slate-800 border-slate-700';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-200 block">
                          {log.actor_name || 'Administrator'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px] block">
                          {log.actor_user_id.slice(0, 8)}...
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${actionColor}`}>
                          {log.action_type}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        <span>{log.target_type}: </span>
                        <span className="text-slate-300">{log.target_id.slice(0, 8)}...</span>
                      </td>

                      <td className="py-3 px-3">
                        {log.previous_status || log.new_status ? (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="text-slate-500">{log.previous_status || 'NONE'}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-indigo-400 font-semibold">{log.new_status || 'NONE'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-slate-300 text-xs line-clamp-2">
                          {log.reason || 'Standard operational moderation'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditHistoryView;
