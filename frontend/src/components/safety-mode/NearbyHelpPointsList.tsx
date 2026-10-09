import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Building2,
  Cross,
  Phone,
  MapPin,
  ExternalLink,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { NearbyHelpPointItem } from '../../types';

interface NearbyHelpPointsListProps {
  helpPoints: NearbyHelpPointItem[];
  isLoading?: boolean;
}

export const NearbyHelpPointsList: React.FC<NearbyHelpPointsListProps> = ({
  helpPoints,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const getHelpPointIcon = (pointType: string) => {
    switch (pointType.toLowerCase()) {
      case 'police_station':
        return <Shield className="w-4 h-4 text-sky-400" />;
      case 'hospital':
        return <Cross className="w-4 h-4 text-emerald-400" />;
      case 'campus_security':
      case 'security_desk':
        return <Building2 className="w-4 h-4 text-indigo-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m away`;
    }
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
        Scanning for verified safe havens near your GPS location...
      </div>
    );
  }

  if (helpPoints.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
        <p className="text-xs font-semibold text-slate-300">
          No verified safe havens located within 10 km.
        </p>
        <p className="text-[11px] text-slate-500">
          SafeSphere verified safe havens are physically vetted safe locations (police stations, hospitals, 24/7 security desks).
        </p>
        <button
          type="button"
          onClick={() => navigate('/map')}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition"
        >
          <span>Explore Regional Safety Map</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {helpPoints.map((hp) => (
        <div
          key={hp.id}
          className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
              {getHelpPointIcon(hp.point_type)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-white transition">
                  {hp.name}
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Verified
                </span>
                {hp.is_24_hours && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    24/7
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                <span className="truncate max-w-xs">{hp.address}</span>
              </p>

              {hp.phone_number && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 shrink-0 text-slate-500" />
                  <span>{hp.phone_number}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
            <span className="text-xs font-black text-emerald-400 tracking-tight">
              {formatDistance(hp.distance_m)}
            </span>

            <button
              type="button"
              onClick={() => navigate('/map')}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
            >
              <span>View on Map</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NearbyHelpPointsList;
