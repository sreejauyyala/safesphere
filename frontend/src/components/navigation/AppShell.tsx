import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased overflow-x-hidden selection:bg-rose-500/30 selection:text-white">
      {/* Top Header */}
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex w-full relative">
        {/* Desktop Sidebar (visible on md+) */}
        <Sidebar className="hidden md:flex min-h-[calc(100vh-4rem)] sticky top-16" />

        {/* Mobile Slide-Over Sidebar Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200">
              <Sidebar
                className="w-full h-full"
                onLinkClick={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 md:pb-8 flex flex-col justify-between">
          <div className="w-full">
            {children}
          </div>

          <footer className="mt-12 pt-6 border-t border-slate-900/80 text-center text-xs text-slate-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                SafeSphere &bull; 24/7 Community Safety Intelligence Network
              </div>
              <div className="text-slate-400">
                Step 3 UI & Navigation Shell Active &bull; Responsive Dashboard
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation (visible only on mobile) */}
      <MobileNavigation onOpenMoreMenu={() => setIsMobileMenuOpen(true)} />
    </div>
  );
};

export default AppShell;
