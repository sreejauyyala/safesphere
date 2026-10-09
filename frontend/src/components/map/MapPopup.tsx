import React from 'react';
import {
  Lightbulb,
  Construction,
  AlertTriangle,
  Users,
  Bus,
  Shield,
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
} from 'lucide-react';
import type { MapSafetyReport, MapHelpPoint, MapHotspot } from '../../types';

interface MapPopupProps {
  type: 'report' | 'help_point' | 'hotspot';
  data: MapSafetyReport | MapHelpPoint | MapHotspot;
}

export const MapPopup: React.FC<MapPopupProps> = ({ type, data }) => {
  if (type === 'report') {
    const report = data as MapSafetyReport;
    const formatTimeAgo = (dateStr: string) => {
      try {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours < 1) return 'Just now';
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
      } catch {
        return 'Recently';
      }
    };

    const getCategoryDetails = (cat: string) => {
      switch (cat) {
        case 'poor_lighting':
          return { label: 'Poor Lighting', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
        case 'road_damage':
          return { label: 'Road Damage', icon: Construction, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
        case 'road_obstruction':
          return { label: 'Road Obstruction', icon: Construction, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
        case 'isolated_area':
          return { label: 'Isolated Passage', icon: Users, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
        case 'transport_issue':
          return { label: 'Transport Issue', icon: Bus, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
        default:
          return { label: 'General Safety Concern', icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
      }
    };

    const catDetails = getCategoryDetails(report.category);
    const CategoryIcon = catDetails.icon;

    return (
      <div className="p-3 text-slate-100 max-w-[270px] space-y-2.5 font-sans">
        <div className="flex items-center justify-between gap-2">
          <div className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${catDetails.color}`}>
            <CategoryIcon className="w-3.5 h-3.5" />
            <span>{catDetails.label}</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
              report.severity === 'critical'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : report.severity === 'high'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : report.severity === 'medium'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-700 text-slate-300 border-slate-600'
            }`}
          >
            {report.severity}
          </span>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white leading-snug">{report.title}</h4>
          {report.description && (
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
              {report.description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Reported: {formatTimeAgo(report.created_at)}
          </span>
          <span className="font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {report.verification_status === 'verified' ? 'Verified' : 'Under Verification'}
          </span>
        </div>
      </div>
    );
  }

  if (type === 'help_point') {
    const hp = data as MapHelpPoint;
    const getTypeLabel = (t: string) => {
      switch (t) {
        case 'police_station':
          return { label: 'Police Station', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
        case 'hospital':
          return { label: '24/7 Hospital / ER', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
        case 'security_desk':
          return { label: 'Security Control Post', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
        case 'campus_security':
          return { label: 'Campus Security Booth', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
        default:
          return { label: 'Verified Safe Haven', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      }
    };

    const typeInfo = getTypeLabel(hp.type);

    return (
      <div className="p-3 text-slate-100 max-w-[270px] space-y-2.5 font-sans">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${typeInfo.badge}`}>
            {typeInfo.label}
          </span>
          {hp.verified && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified ✓
            </span>
          )}
        </div>

        <div>
          <h4 className="text-xs font-bold text-white leading-snug">{hp.name}</h4>
          <p className="text-[11px] text-slate-300 mt-1 flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>{hp.address}</span>
          </p>
        </div>

        {hp.phone && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Emergency Phone:</span>
            <a
              href={`tel:${hp.phone}`}
              className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              {hp.phone}
            </a>
          </div>
        )}
      </div>
    );
  }

  if (type === 'hotspot') {
    const hs = data as MapHotspot;
    return (
      <div className="p-3 text-slate-100 max-w-[270px] space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            {hs.level} Concern Area
          </span>
          <span className="text-[10px] text-slate-400">Radius: {Math.round(hs.radius)}m</span>
        </div>

        <h4 className="text-xs font-bold text-white leading-snug">{hs.label}</h4>
        {hs.description && (
          <p className="text-[11px] text-slate-300 leading-relaxed">{hs.description}</p>
        )}

        <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Source: {hs.source}</span>
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3" /> Caution Area
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default MapPopup;
