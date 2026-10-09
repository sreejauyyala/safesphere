import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Users, 
  AlertCircle, 
  Mail, 
  Phone, 
  MapPin, 
  UserPlus
} from 'lucide-react';
import type { Organization, OrganizationType, OrganizationStatus } from '../../types';
import adminService from '../../services/adminService';

interface OrganizationManagementViewProps {
  isSystemAdmin: boolean;
  onRefreshParent: () => void;
}

export const OrganizationManagementView: React.FC<OrganizationManagementViewProps> = ({
  isSystemAdmin,
  onRefreshParent,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<string | null>(null);

  // New Org Form State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<OrganizationType>('COLLEGE');
  const [newDescription, setNewDescription] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New Member Form State
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [memberError, setMemberError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isSystemAdmin) {
        const list = await adminService.getOrganizations();
        setOrganizations(list);
      } else {
        const org = await adminService.getMyOrganization();
        setOrganizations([org]);
      }
    } catch (err) {
      console.error('Failed to load organization data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isSystemAdmin]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setFormError('Organization name and contact email are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      await adminService.createOrganization({
        name: newName.trim(),
        org_type: newType,
        description: newDescription.trim() || undefined,
        contact_email: newEmail.trim(),
        contact_phone: newPhone.trim() || undefined,
        address: newAddress.trim() || undefined,
        status: 'ACTIVE',
        is_verified: true,
      });
      setShowCreateModal(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewDescription('');
      setNewPhone('');
      setNewAddress('');
      loadData();
      onRefreshParent();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setFormError(errObj?.message || 'Failed to create organization.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent, orgId: string) => {
    e.preventDefault();
    if (!memberUserId.trim()) {
      setMemberError('User ID is required.');
      return;
    }
    setSubmitting(true);
    setMemberError(null);

    try {
      await adminService.addOrganizationMember(orgId, {
        user_id: memberUserId.trim(),
        role: memberRole,
      });
      setShowAddMemberModal(null);
      setMemberUserId('');
      loadData();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setMemberError(errObj?.message || 'Failed to add member to organization.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orgId: string, status: OrganizationStatus) => {
    try {
      await adminService.updateOrganization(orgId, { status });
      loadData();
    } catch (err) {
      console.error('Failed to update organization status', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            {isSystemAdmin ? 'Global Organization Directory & Registry' : 'My Organization Profile'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSystemAdmin
              ? 'Authorized directory of campuses, workplaces, residential zones, and local safety authorities.'
              : 'Jurisdictional profile, operational points of contact, and active responders.'}
          </p>
        </div>

        {isSystemAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Register Organization</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading organization profiles...
        </div>
      ) : organizations.length === 0 ? (
        <div className="p-12 text-center text-slate-500 rounded-2xl glass-card border border-slate-800">
          No organizations registered in current scope.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="p-5 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{org.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {org.org_type}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      org.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : org.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {org.status}
                  </span>
                </div>

                {org.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{org.description}</p>
                )}

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{org.contact_email}</span>
                  </div>
                  {org.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{org.contact_phone}</span>
                    </div>
                  )}
                  {org.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="line-clamp-1">{org.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer stats & actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{org.member_count ?? 1} members</span>
                  </span>
                </div>

                {isSystemAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddMemberModal(org.id)}
                      title="Add Organization Member"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                    {org.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleStatusChange(org.id, 'SUSPENDED')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(org.id, 'ACTIVE')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Verified Organization
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl glass-card border border-slate-700/80 p-6 space-y-4 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Register New Organization
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Organization Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Metro Tech Campus Security"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Organization Type *</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as OrganizationType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="COLLEGE">College / University</option>
                  <option value="COMPANY">Company / Workplace</option>
                  <option value="RESIDENTIAL_COMMUNITY">Residential Community</option>
                  <option value="CAMPUS_SECURITY">Campus Security</option>
                  <option value="PUBLIC_SPACE_MANAGER">Public Space Manager</option>
                  <option value="LOCAL_AUTHORITY">Authorized Local Authority</option>
                  <option value="OTHER">Other Civic Entity</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Contact Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="security@metrotech.org"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Phone (Optional)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1-555-0199"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Jurisdictional Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="100 Innovation Way, Building 4"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Operational Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Campus safety dispatch and physical facilities management."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl glass-card border border-slate-700/80 p-6 space-y-4 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Add Organization Member
            </h3>

            {memberError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{memberError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleAddMember(e, showAddMemberModal)} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">User UUID *</label>
                <input
                  type="text"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  placeholder="e.g. c39b2075-..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Role *</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="ADMIN">Organization Administrator</option>
                  <option value="MEMBER">Standard Member</option>
                  <option value="RESPONDER">Field Responder</option>
                  <option value="DISPATCHER">Dispatcher</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationManagementView;
