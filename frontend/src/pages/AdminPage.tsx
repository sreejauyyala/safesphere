import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  AlertOctagon, 
  MapPin, 
  BarChart3, 
  History, 
  Building2, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import adminService from '../services/adminService';
import type { 
  AdminDashboardMetrics, 
  ReportAdminItem, 
  Organization 
} from '../types';

import AdminSummaryCards from '../components/admin/AdminSummaryCards';
import ReportManagementTable from '../components/admin/ReportManagementTable';
import PreventiveActionQueue from '../components/admin/PreventiveActionQueue';
import AdminMapPanel from '../components/admin/AdminMapPanel';
import AdminAnalyticsView from '../components/admin/AdminAnalyticsView';
import AdminAuditHistoryView from '../components/admin/AdminAuditHistoryView';
import OrganizationManagementView from '../components/admin/OrganizationManagementView';

export const AdminPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSystemAdmin = userProfile?.role === 'SYSTEM_ADMIN';

  // Navigation tab from URL query param
  const activeTab = searchParams.get('tab') || 'overview';

  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [reports, setReports] = useState<ReportAdminItem[]>([]);
  const [totalReports, setTotalReports] = useState<number>(0);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters for reports table
  const [reportFilters, setReportFilters] = useState({
    category: '',
    severity: '',
    verification_status: '',
    status: '',
    search: '',
    page: 1,
    limit: 15,
  });

  // Load Dashboard Metrics & Organization Context
  const loadDashboardData = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const [dashMetrics, orgsList] = await Promise.all([
        adminService.getDashboard(),
        isSystemAdmin ? adminService.getOrganizations() : adminService.getMyOrganization().then((o) => [o]),
      ]);
      setMetrics(dashMetrics);
      setOrganizations(orgsList);
      if (!isSystemAdmin && orgsList.length > 0) {
        setCurrentOrg(orgsList[0]);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard metrics', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [isSystemAdmin]);

  // Load Reports
  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const offset = (reportFilters.page - 1) * reportFilters.limit;
      const res = await adminService.getReports({
        category: reportFilters.category || undefined,
        severity: reportFilters.severity || undefined,
        verification_status: reportFilters.verification_status || undefined,
        status: reportFilters.status || undefined,
        limit: reportFilters.limit,
        offset,
      });

      let items = res.items;
      if (reportFilters.search.trim()) {
        const query = reportFilters.search.toLowerCase();
        items = items.filter(
          (r) =>
            r.title.toLowerCase().includes(query) ||
            r.description.toLowerCase().includes(query) ||
            r.id.toLowerCase().includes(query)
        );
      }
      setReports(items);
      setTotalReports(res.total);
    } catch (err) {
      console.error('Failed to load safety reports', err);
    } finally {
      setLoadingReports(false);
    }
  }, [reportFilters]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadReports()]);
    setRefreshing(false);
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleFilterChange = (key: string, value: any) => {
    setReportFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset page when filters change
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'reports', label: 'Safety Reports & Moderation', icon: FileText },
    { id: 'queue', label: 'Action Queue', icon: AlertOctagon },
    { id: 'map', label: 'Jurisdiction Map', icon: MapPin },
    { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3 },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'organizations', label: isSystemAdmin ? 'Organization Directory' : 'Organization Profile', icon: Building2 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Scope Header */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              SafeSphere Operational Command
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>Jurisdiction Scope: </span>
            <span className="font-bold text-amber-400">
              {metrics?.scope_name || (isSystemAdmin ? 'System-Wide Global Scope' : 'Assigned Organization')}
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {userProfile?.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview / Operations Dashboard */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <AdminSummaryCards metrics={metrics} loading={loadingMetrics} />

          {/* Dual Action / Preview Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Action Queue Preview */}
            <div className="p-5 rounded-3xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-100">Top Priority Action Queue</h3>
                </div>
                <button
                  onClick={() => handleTabChange('queue')}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {reports.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block line-clamp-1">{r.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {r.category} • Severity: {r.severity}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        r.verification_status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {r.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Operations Map Teaser */}
            <div className="p-5 rounded-3xl glass-card border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-100">Jurisdictional Map Overview</h3>
                  </div>
                  <button
                    onClick={() => handleTabChange('map')}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Full Map View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Inspect cluster markers, localized lighting outages, and territorial boundaries on the interactive safety canvas.
                </p>
              </div>

              <div
                onClick={() => handleTabChange('map')}
                className="h-44 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-indigo-500/50 transition-all text-center space-y-2 group"
              >
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  Open Interactive Jurisdictional Map
                </span>
                <span className="text-[10px] text-slate-500">
                  {reports.length} safety observations currently plotted
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Safety Reports & Moderation */}
      {activeTab === 'reports' && (
        <ReportManagementTable
          reports={reports}
          total={totalReports}
          loading={loadingReports}
          organizations={organizations}
          currentOrgId={currentOrg?.id}
          isSystemAdmin={isSystemAdmin}
          filters={reportFilters}
          onFilterChange={handleFilterChange}
          onRefresh={loadReports}
        />
      )}

      {/* Tab 3: Action Queue */}
      {activeTab === 'queue' && (
        <PreventiveActionQueue
          organizations={organizations}
          currentOrgId={currentOrg?.id}
          isSystemAdmin={isSystemAdmin}
          onRefreshParent={loadDashboardData}
        />
      )}

      {/* Tab 4: Jurisdictional Map */}
      {activeTab === 'map' && (
        <AdminMapPanel
          reports={reports}
          organizations={organizations}
          currentOrgId={currentOrg?.id}
          isSystemAdmin={isSystemAdmin}
          onRefresh={loadReports}
        />
      )}

      {/* Tab 5: Analytics & Trends */}
      {activeTab === 'analytics' && (
        <AdminAnalyticsView onRefreshParent={loadDashboardData} />
      )}

      {/* Tab 6: Audit History */}
      {activeTab === 'audit' && (
        <AdminAuditHistoryView />
      )}

      {/* Tab 7: Organization Management */}
      {activeTab === 'organizations' && (
        <OrganizationManagementView
          isSystemAdmin={isSystemAdmin}
          onRefreshParent={loadDashboardData}
        />
      )}
    </div>
  );
};

export default AdminPage;
