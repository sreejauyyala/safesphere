import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Activity, 
  ShieldAlert, 
  Timer 
} from 'lucide-react';
import type { AdminDashboardMetrics } from '../../types';

interface AdminSummaryCardsProps {
  metrics: AdminDashboardMetrics | null;
  loading: boolean;
}

export const AdminSummaryCards: React.FC<AdminSummaryCardsProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl glass-card border border-slate-800 bg-slate-900/40 p-4" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Reports In Scope',
      value: metrics?.total_reports_in_scope ?? 0,
      icon: FileText,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      description: 'Total safety observations in jurisdictional area',
    },
    {
      label: 'Pending Review',
      value: metrics?.pending_review ?? 0,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      description: 'Awaiting authorized moderation or verification',
    },
    {
      label: 'Officially Verified',
      value: metrics?.verified_reports ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      description: 'Confirmed legitimate environmental concerns',
    },
    {
      label: 'Active Unresolved',
      value: metrics?.active_unresolved_issues ?? 0,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      description: 'Open hazards requiring remediation',
    },
    {
      label: 'Assigned for Action',
      value: metrics?.issues_assigned ?? 0,
      icon: UserCheck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      description: 'Delegated to responder or maintenance team',
    },
    {
      label: 'In Progress Work',
      value: metrics?.issues_in_progress ?? 0,
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      description: 'Field remediation currently underway',
    },
    {
      label: 'Resolution Disputes',
      value: metrics?.resolution_disputes ?? 0,
      icon: ShieldAlert,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      description: 'Community reports hazard is still present',
    },
    {
      label: 'Avg Resolution Time',
      value: metrics?.avg_resolution_hours !== null && metrics?.avg_resolution_hours !== undefined
        ? `${metrics.avg_resolution_hours}h`
        : 'N/A',
      icon: Timer,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      description: 'From formal assignment to verified completion',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl border ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-100 tracking-tight">
                {card.value}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                {card.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminSummaryCards;
