import React from 'react';
import { Activity, AlertTriangle, Navigation, HeartHandshake, MessageSquare, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import { mockRecentActivity, type MockRecentActivityItem } from '../../mock/demoData';

export interface RecentActivityProps {
  activities?: MockRecentActivityItem[];
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities = mockRecentActivity,
  className = '',
}) => {
  const getIcon = (type: MockRecentActivityItem['type']) => {
    switch (type) {
      case 'report':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'journey':
        return <Navigation className="w-4 h-4 text-blue-400" />;
      case 'guardian':
        return <HeartHandshake className="w-4 h-4 text-purple-400" />;
      case 'feedback':
      default:
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <Card
      variant="card"
      className={className}
      icon={<Activity className="w-5 h-5 text-indigo-400" />}
      title="Recent Safety Activity"
      subtitle="Audit log of your personal and community actions"
    >
      <div className="space-y-3">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
              {getIcon(item.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-200 truncate">
                  {item.title}
                </h4>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {item.timeAgo}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {item.description}
              </p>
            </div>

            <div className="shrink-0 self-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;
