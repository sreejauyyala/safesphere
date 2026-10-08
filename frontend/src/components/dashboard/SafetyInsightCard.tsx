import React from 'react';
import { Lightbulb, Construction, Users, Hospital, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import { mockSafetyInsights, type MockSafetyInsight } from '../../mock/demoData';

export interface SafetyInsightCardProps {
  insights?: MockSafetyInsight[];
  className?: string;
  onViewAll?: () => void;
}

export const SafetyInsightCard: React.FC<SafetyInsightCardProps> = ({
  insights = mockSafetyInsights,
  className = '',
  onViewAll,
}) => {
  const getInsightIcon = (type: MockSafetyInsight['type']) => {
    switch (type) {
      case 'lighting':
        return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'road':
        return <Construction className="w-4 h-4 text-orange-400" />;
      case 'patrol':
        return <Users className="w-4 h-4 text-indigo-400" />;
      case 'helppoint':
      default:
        return <Hospital className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getSeverityBadge = (severity: MockSafetyInsight['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'info':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <Card
      variant="card"
      className={className}
      icon={<Users className="w-5 h-5 text-indigo-400" />}
      title="Community Safety Insights"
      subtitle="Crowd-verified localized environmental intelligence"
      action={
        onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )
      }
    >
      <div className="space-y-2.5">
        {insights.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
              {getInsightIcon(item.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-200 truncate">
                  {item.title}
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 uppercase tracking-wider ${getSeverityBadge(item.severity)}`}>
                  {item.severity}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-800/40">
                <span>📍 {item.location}</span>
                <span>{item.timeAgo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default SafetyInsightCard;
