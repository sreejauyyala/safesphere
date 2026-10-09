import React, { useState, useEffect } from 'react';
import { MapPin, Shield, RefreshCw, UserPlus, Wrench } from 'lucide-react';
import { SafeSphereMap } from '../map/SafeSphereMap';
import type { ReportAdminItem, AdminHotspotItem, Organization, MapSafetyReport, MapHotspot } from '../../types';
import adminService from '../../services/adminService';
import IssueAssignmentModal from './IssueAssignmentModal';
import IssueResolutionModal from './IssueResolutionModal';

interface AdminMapPanelProps {
  reports: ReportAdminItem[];
  organizations: Organization[];
  currentOrgId?: string | null;
  isSystemAdmin: boolean;
  onRefresh: () => void;
}

export const AdminMapPanel: React.FC<AdminMapPanelProps> = ({
  reports,
  organizations,
  currentOrgId,
  isSystemAdmin,
  onRefresh,
}) => {
  const [hotspots, setHotspots] = useState<AdminHotspotItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportAdminItem | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [loadingHotspots, setLoadingHotspots] = useState<boolean>(false);

  useEffect(() => {
    loadHotspots();
  }, []);

  const loadHotspots = async () => {
    setLoadingHotspots(true);
    try {
      const data = await adminService.getHotspots(500, 2);
      setHotspots(data);
    } catch (err) {
      console.error('Failed to load hotspots', err);
    } finally {
      setLoadingHotspots(false);
    }
  };

  // Convert ReportAdminItem into MapSafetyReport for SafeSphereMap
  const mapReports: MapSafetyReport[] = reports.map((r) => ({
    id: r.id,
    report_type: (r.report_type as any) || 'CITIZEN_REPORT',
    category: r.category as any,
    title: r.title,
    description: r.description,
    severity: r.severity as any,
    latitude: r.latitude,
    longitude: r.longitude,
    address_text: r.address_text || undefined,
    status: r.status as any,
    verification_status: r.verification_status as any,
    created_at: r.created_at,
    has_image: r.has_image,
    has_voice: r.has_voice,
  }));

  // Convert AdminHotspotItem into MapHotspot
  const mapHotspots: MapHotspot[] = hotspots.map((h) => ({
    id: h.hotspot_id,
    label: `${h.category.replace('_', ' ').toUpperCase()} Cluster`,
    level: h.risk_level === 'CRITICAL' ? 'higher' : h.risk_level === 'HIGH' ? 'elevated' : 'moderate',
    latitude: h.center_lat,
    longitude: h.center_lon,
    radius: 250,
    source: 'SafeSphere Operational Engine',
    description: h.description,
    updated_at: new Date().toISOString(),
  }));

  const handleMarkerClick = (marker: any) => {
    if (marker && marker.id) {
      const found = reports.find((r) => r.id === marker.id);
      if (found) {
        setSelectedReport(found);
      }
    }
  };

  const centerLat = reports.length > 0 ? reports[0].latitude : 17.385;
  const centerLng = reports.length > 0 ? reports[0].longitude : 78.4867;

  return (
    <div className="space-y-4">
      {/* Map Control Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            Jurisdictional Operations & Incident Map
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Geographic overview of verified hazards, recurring environmental concerns, and active work orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadHotspots}
            disabled={loadingHotspots}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHotspots ? 'animate-spin' : ''}`} />
            <span>Refresh Clusters</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Interactive Map */}
        <div className="lg:col-span-3 rounded-2xl glass-card border border-slate-800 overflow-hidden h-[540px] relative">
          <SafeSphereMap
            center={[centerLat, centerLng]}
            zoom={13}
            reports={mapReports}
            hotspots={mapHotspots}
            showReports={true}
            showHotspots={true}
            showHelpPoints={true}
            showUserLocation={false}
            onMarkerClick={handleMarkerClick}
          />
        </div>

        {/* Selected Issue / Hotspots Inspector */}
        <div className="rounded-2xl glass-card border border-slate-800 p-4 space-y-4 flex flex-col justify-between h-[540px] overflow-y-auto">
          {selectedReport ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  Report Detail
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {selectedReport.verification_status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 leading-snug">
                  {selectedReport.title}
                </h4>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Category: {selectedReport.category} | Severity: {selectedReport.severity}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                {selectedReport.description}
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-500">Location: </span>
                  <span className="font-mono text-slate-300">
                    {selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Assignment: </span>
                  <span className="text-cyan-400 font-semibold">
                    {selectedReport.assigned_organization_name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Community Confirmations: </span>
                  <span className="text-emerald-400 font-semibold">
                    {selectedReport.community_confirmations}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign Work Order</span>
                </button>
                {selectedReport.status !== 'RESOLVED' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Record Resolution</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Hotspots & Concern Clusters
                </span>
                <p className="text-[10px] text-slate-500 mt-1">
                  Click any marker or hotspot circle on the map to inspect details and assign remediation.
                </p>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {hotspots.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    No active recurring concern clusters detected.
                  </div>
                ) : (
                  hotspots.map((h) => (
                    <div
                      key={h.hotspot_id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 capitalize">
                          {h.category.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {h.report_count} reports
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{h.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                        <span>Risk: {h.risk_level}</span>
                        <span>{h.unresolved_count} unresolved</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-500">
            🛡️ SafeSphere Integrity: Clusters reflect geographic concentrations of public reports, not guaranteed crime forecasts.
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedReport && (
        <IssueAssignmentModal
          report={selectedReport}
          organizations={organizations}
          currentOrgId={currentOrgId}
          isSystemAdmin={isSystemAdmin}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            onRefresh();
            setShowAssignModal(false);
          }}
        />
      )}

      {/* Resolution Modal */}
      {showResolveModal && selectedReport && (
        <IssueResolutionModal
          report={selectedReport}
          onClose={() => setShowResolveModal(false)}
          onSuccess={() => {
            onRefresh();
            setShowResolveModal(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminMapPanel;
