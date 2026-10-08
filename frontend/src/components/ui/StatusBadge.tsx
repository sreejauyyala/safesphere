import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, Activity, CheckCircle2 } from 'lucide-react';

export type StatusVariant = 
  | 'safe' 
  | 'calculating' 
  | 'warning' 
  | 'danger' 
  | 'minor' 
  | 'verified' 
  | 'pending'
  | 'info';

export interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  pulse = false,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'safe':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
          text: label || 'Safe',
        };
      case 'calculating':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
          dot: 'bg-indigo-400',
          icon: Clock,
          text: label || 'Calculating...',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
          text: label || 'Moderate',
        };
      case 'danger':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dot: 'bg-rose-500',
          icon: ShieldAlert,
          text: label || 'High Caution',
        };
      case 'minor':
        return {
          bg: 'bg-purple-950/40 border-purple-800/50 text-purple-300',
          dot: 'bg-purple-400',
          icon: ShieldAlert,
          text: label || 'Minor Safeguard',
        };
      case 'verified':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: CheckCircle2,
          text: label || 'Verified',
        };
      case 'pending':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
          dot: 'bg-amber-400',
          icon: Clock,
          text: label || 'Pending',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
          dot: 'bg-blue-400',
          icon: Activity,
          text: label || String(status),
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      role="status"
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.text}</span>
    </span>
  );
};

export default StatusBadge;
