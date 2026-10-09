import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Calendar } from 'lucide-react';
import type { ReportItem } from '../../types';
import { CATEGORIES } from './ReportCategorySelector';
import { SEVERITIES } from './ReportSeveritySelector';
import ReportStatusBadge from './ReportStatusBadge';

interface ReportCardProps {
  report: ReportItem;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
  const navigate = useNavigate();

  const catObj = CATEGORIES.find((c) => c.id === report.category) || {
    name: report.category,
    icon: '⚠️',
  };

  const sevObj = SEVERITIES.find((s) => s.level === report.severity?.toUpperCase()) || {
    name: report.severity || 'Medium',
    colorClass: 'text-amber-400',
    activeBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/30',
  };

  // Format relative or date time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      onClick={() => navigate(`/report/${report.id}`)}
      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-750 hover:bg-slate-850/60 transition-all cursor-pointer group shadow-sm flex flex-col justify-between space-y-3"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
            {catObj.icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
              {report.title || catObj.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                {report.location_label || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sevObj.activeBg} ${sevObj.activeBorder} ${sevObj.colorClass}`}
          >
            {sevObj.name}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Description Snippet */}
      {report.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {report.description}
        </p>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatTime(report.created_at)}</span>
        </div>

        <ReportStatusBadge
          status={report.status}
          verificationStatus={report.verification_status}
          size="sm"
        />
      </div>
    </div>
  );
};

export default ReportCard;
