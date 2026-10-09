import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireGuardianComplete?: boolean;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireGuardianComplete = true,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, isMinor, hasGuardian, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">
          Verifying SafeSphere Identity...
        </span>
      </div>
    );
  }

  // 1. Unauthenticated users redirected to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Minor account protection: if user is under 18 and has NOT completed guardian setup,
  // redirect them to /guardian to complete required setup (unless they are already on /guardian)
  if (requireGuardianComplete && isMinor && !hasGuardian && location.pathname !== '/guardian') {
    return <Navigate to="/guardian" state={{ reason: 'guardian_required' }} replace />;
  }

  // 3. Role-based access control (RBAC)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = userProfile?.role || 'USER';
    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/20 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Restricted Administrative Area</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                This portal is strictly reserved for verified organization safety coordinators and system administrators.
                Your current account role (<span className="font-mono text-rose-400">{userRole}</span>) does not possess authorized privileges.
              </p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Community Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;

