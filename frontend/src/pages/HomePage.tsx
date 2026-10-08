import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SafetyPulseCard from '../components/dashboard/SafetyPulseCard';
import QuickActionCard from '../components/dashboard/QuickActionCard';
import LocationCard from '../components/dashboard/LocationCard';
import SafeMapPreview from '../components/dashboard/SafeMapPreview';
import JourneyCard from '../components/dashboard/JourneyCard';
import SafetyInsightCard from '../components/dashboard/SafetyInsightCard';
import GuardianCard from '../components/dashboard/GuardianCard';
import TrustedCircleCard from '../components/dashboard/TrustedCircleCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import { Shield } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { userProfile, isMinor } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = userProfile?.full_name ? userProfile.full_name.split(' ')[0] : 'Community Member';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & Welcome Greeting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>24/7 Community Shield Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Your community safety companion &bull; Intelligence network connected
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Account: <strong className="text-slate-100">{userProfile?.role || 'USER'}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Cards (4 Cards) */}
      <QuickActionCard />

      {/* 3. Safety Pulse + Current Location Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SafetyPulseCard />
        </div>
        <div className="lg:col-span-1">
          <LocationCard />
        </div>
      </div>

      {/* 4. Guardian Connect Card (Dynamically displayed ONLY for minors under 18) */}
      {isMinor && (
        <div>
          <GuardianCard />
        </div>
      )}

      {/* 5. Safety Map Preview + Active Journey Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SafeMapPreview />
        <JourneyCard />
      </div>

      {/* 6. Community Safety Insights + Trusted Circle + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <SafetyInsightCard />
        <TrustedCircleCard />
        <RecentActivity />
      </div>
    </div>
  );
};

export default HomePage;
