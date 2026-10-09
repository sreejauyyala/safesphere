import React from 'react';
import { Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface ReportStatusBadgeProps {
  status: string;
  verificationStatus?: string;
  size?: 'sm' | 'md';
}

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({
  status,
  verificationStatus,
  size = 'md',
}) => {
  const normStatus = status?.toUpperCase() || 'OPEN';

  let label = 'Open';
  let badgeClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  let Icon = Clock;

  if (normStatus === 'IN_REVIEW' || normStatus === 'UNDER_VERIFICATION') {
    label = 'Under Review';
    badgeClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    Icon = Clock;
  } else if (normStatus === 'RESOLVED') {
    label = 'Resolved';
    badgeClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    Icon = CheckCircle2;
  } else if (normStatus === 'REJECTED') {
    label = 'Rejected';
    badgeClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    Icon = XCircle;
  } else if (normStatus === 'OPEN' || normStatus === 'SUBMITTED') {
    label = 'Open';
    badgeClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    Icon = AlertCircle;
  }

  const isVerified = verificationStatus?.toUpperCase() === 'VERIFIED';

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border ${badgeClasses} ${
          size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
        }`}
      >
        <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
        <span>{label}</span>
      </span>

      {isVerified && (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 ${
            size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2 py-0.5'
          }`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Verified ✓</span>
        </span>
      )}
    </div>
  );
};

export default ReportStatusBadge;
