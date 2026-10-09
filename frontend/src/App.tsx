import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import ReportDetailPage from './pages/ReportDetailPage';
import JourneyPage from './pages/JourneyPage';


import SafetyModePage from './pages/SafetyModePage';
import TrustedCirclePage from './pages/TrustedCirclePage';
import GuardianPage from './pages/GuardianPage';
import ProfilePage from './pages/ProfilePage';
import FeedbackPage from './pages/FeedbackPage';
import AdminPage from './pages/AdminPage';
import SharedJourneyPage from './pages/SharedJourneyPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <Routes>
            <Route element={<RootLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/shared-journey/:token" element={<SharedJourneyPage />} />

            {/* Minor Setup & Identity Management (allow minors even before guardian completed) */}
            <Route
              path="/guardian"
              element={
                <ProtectedRoute requireGuardianComplete={false}>
                  <GuardianPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireGuardianComplete={false}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes (require guardian setup if minor) */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report-history"
              element={
                <ProtectedRoute>
                  <Navigate to="/report?tab=history" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/:id"
              element={
                <ProtectedRoute>
                  <ReportDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/journey"
              element={
                <ProtectedRoute>
                  <JourneyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-mode"
              element={
                <ProtectedRoute>
                  <SafetyModePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trusted-circle"
              element={
                <ProtectedRoute>
                  <TrustedCirclePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <FeedbackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LocationProvider>
    </AuthProvider>
  </BrowserRouter>
);
};

export default App;
