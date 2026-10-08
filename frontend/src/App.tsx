import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import JourneyPage from './pages/JourneyPage';
import SafetyModePage from './pages/SafetyModePage';
import TrustedCirclePage from './pages/TrustedCirclePage';
import GuardianPage from './pages/GuardianPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/safety-mode" element={<SafetyModePage />} />
          <Route path="/trusted-circle" element={<TrustedCirclePage />} />
          <Route path="/guardian" element={<GuardianPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
