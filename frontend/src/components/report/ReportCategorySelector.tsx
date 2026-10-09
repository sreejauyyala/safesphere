import React from 'react';
import { Lightbulb, Construction, Cone, Users, Bus, AlertTriangle, HelpCircle } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  LucideIcon: React.FC<{ className?: string }>;
  description: string;
  borderClass: string;
  badgeClass: string;
}

export const CATEGORIES: CategoryOption[] = [
  {
    id: 'poor_lighting',
    name: 'Poor Lighting',
    icon: '💡',
    LucideIcon: Lightbulb,
    description: 'Dark streets, non-functional lamps, or missing lighting',
    borderClass: 'border-amber-500/40 hover:border-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    id: 'road_damage',
    name: 'Road Damage',
    icon: '🛣️',
    LucideIcon: Construction,
    description: 'Potholes, broken footpaths, open manholes or trenches',
    borderClass: 'border-orange-500/40 hover:border-orange-400',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  {
    id: 'road_obstruction',
    name: 'Road Obstruction',
    icon: '🚧',
    LucideIcon: Cone,
    description: 'Fallen trees, debris, illegal parking blocking pedestrian flow',
    borderClass: 'border-amber-500/40 hover:border-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    id: 'isolated_area',
    name: 'Isolated Area',
    icon: '👥',
    LucideIcon: Users,
    description: 'Deserted alleys, low foot-traffic routes, or lack of oversight',
    borderClass: 'border-indigo-500/40 hover:border-indigo-400',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'transport_issue',
    name: 'Transport Issue',
    icon: '🚌',
    LucideIcon: Bus,
    description: 'Missing transit, unsafe waiting stands, or stranded commutes',
    borderClass: 'border-blue-500/40 hover:border-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    id: 'general_safety',
    name: 'General Safety Concern',
    icon: '⚠️',
    LucideIcon: AlertTriangle,
    description: 'Environmental or infrastructural concerns affecting safety',
    borderClass: 'border-rose-500/40 hover:border-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  {
    id: 'other',
    name: 'Other Issue',
    icon: '❓',
    LucideIcon: HelpCircle,
    description: 'Other community observations requiring municipal review',
    borderClass: 'border-slate-500/40 hover:border-slate-400',
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
];

interface ReportCategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const ReportCategorySelector: React.FC<ReportCategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">
          Report Category <span className="text-rose-400">*</span>
        </label>
        <span className="text-xs text-slate-400">Select one that best matches</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex items-start gap-3 relative ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50 text-slate-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 border ${
                  isSelected ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-100">{cat.name}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>
              {isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReportCategorySelector;
