import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            SafeSphere &bull; 24/7 Community Safety Intelligence Network
          </div>
          <div className="text-slate-400">
            Step 1 Foundation Mode &bull; Gemini AI, Live Pulse & FCM Ready
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RootLayout;
