import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Map as MapIcon,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Share2,
} from 'lucide-react';
import type { ReportItem } from '../types';
import reportService from '../services/reportService';
import { CATEGORIES } from '../components/report/ReportCategorySelector';
import { SEVERITIES } from '../components/report/ReportSeveritySelector';
import ReportStatusBadge from '../components/report/ReportStatusBadge';
import SafeSphereMap from '../components/map/SafeSphereMap';
import { useAuth } from '../contexts/AuthContext';
import CommunityVerificationPanel from '../components/feedback/CommunityVerificationPanel';

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();


  const [report, setReport] = useState<ReportItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await reportService.getReport(id);
        setReport(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Report not found. It may have been removed or resolved.');
        } else {
          setError('Unable to load report details. Please check your connection.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await reportService.deleteReport(id);
      navigate('/report?tab=history');
    } catch {
      setError('Unable to delete report. You can only delete your own submitted reports.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
        <p className="text-sm text-slate-400">Loading safety report details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">{error || 'Report Not Found'}</h3>
        <button
          type="button"
          onClick={() => navigate('/report')}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
        >
          Return to Reports
        </button>
      </div>
    );
  }

  const catObj = CATEGORIES.find((c) => c.id === report.category) || {
    id: report.category,
    name: report.category.replace('_', ' '),
    icon: '⚠️',
  };

  const sevObj = SEVERITIES.find((s) => s.level === report.severity?.toUpperCase()) || {
    name: report.severity || 'Medium',
    colorClass: 'text-amber-400',
    activeBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/30',
  };

  // Check if current user is owner (or if report belongs to user)
  const isOwner = Boolean(userProfile && report.user_id && userProfile.id === report.user_id);


  const formattedDate = new Date(report.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
              title="Delete report"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: report.title || catObj.name,
                  text: report.description,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Share report"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
              {catObj.icon}
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                Safety Incident
              </span>
              <h1 className="text-lg font-bold text-slate-100">{report.title || catObj.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${sevObj.activeBg} ${sevObj.activeBorder} ${sevObj.colorClass}`}
            >
              Severity: {sevObj.name}
            </span>
            <ReportStatusBadge
              status={report.status}
              verificationStatus={report.verification_status}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
            Observation Details
          </span>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            {report.description}
          </p>
        </div>

        {/* Metadata info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-300">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[10px]">Reported Timestamp</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-300">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 block text-[10px]">Location</span>
              <span className="truncate block">
                {report.location_label || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Community Verification & Independent Observation Panel */}
        <CommunityVerificationPanel
          report={report}
          onReportUpdated={(updated) => setReport(updated)}
        />

        {/* Map Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Hazard Location
            </span>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
            >
              <MapIcon className="w-3.5 h-3.5" />
              View on Safety Map
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800">
            <SafeSphereMap
              center={[report.latitude, report.longitude]}
              zoom={16}
              customMarker={{
                latitude: report.latitude,
                longitude: report.longitude,
                label: report.location_label || catObj.name,
                icon: catObj.icon,
              }}
              className="h-[220px] w-full"
              showReports={false}
              showHelpPoints={false}
              showHotspots={false}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Delete This Report?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This report marker will be permanently removed from the SafeSphere Safety Map.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetailPage;
