import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireGuardianComplete?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireGuardianComplete = true 
}) => {
  const { isAuthenticated, isLoading, isMinor, hasGuardian } = useAuth();
  const location = useLocation();

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

  return children;
};

export default ProtectedRoute;
