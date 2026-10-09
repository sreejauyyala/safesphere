import React, { useState } from 'react';
import { Filter, X, RotateCcw, Check } from 'lucide-react';
import type { MapFilterState } from '../../types';

interface MapFiltersProps {
  filters: MapFilterState;
  onApplyFilters: (newFilters: MapFilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const defaultMapFilters: MapFilterState = {
  categories: [
    'poor_lighting',
    'road_damage',
    'road_obstruction',
    'isolated_area',
    'transport_issue',
    'general_safety',
  ],
  helpPointTypes: ['police_station', 'hospital', 'security_desk', 'campus_security', 'verified_help_point'],
  showHotspots: true,
  showReports: true,
  showHelpPoints: true,
};

export const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onApplyFilters,
  isOpen,
  onClose,
}) => {
  const [localState, setLocalState] = useState<MapFilterState>(filters);

  if (!isOpen) return null;

  const reportCategories = [
    { id: 'poor_lighting', label: 'Poor Lighting', icon: '💡' },
    { id: 'road_damage', label: 'Road Damage', icon: '🛣️' },
    { id: 'road_obstruction', label: 'Road Obstruction', icon: '🚧' },
    { id: 'isolated_area', label: 'Isolation / Deserted', icon: '👥' },
    { id: 'transport_issue', label: 'Transport Issue', icon: '🚌' },
    { id: 'general_safety', label: 'General Hazard', icon: '⚠️' },
  ];

  const helpTypes = [
    { id: 'police_station', label: 'Police Stations', icon: '👮' },
    { id: 'hospital', label: '24/7 Hospitals / ER', icon: '🏥' },
    { id: 'security_desk', label: 'Security Posts', icon: '🛡️' },
    { id: 'campus_security', label: 'Campus Security', icon: '🏫' },
    { id: 'verified_help_point', label: 'Verified Safe Havens', icon: '📍' },
  ];

  const toggleCategory = (catId: string) => {
    setLocalState((prev) => {
      const exists = prev.categories.includes(catId);
      const newCats = exists
        ? prev.categories.filter((c) => c !== catId)
        : [...prev.categories, catId];
      return { ...prev, categories: newCats };
    });
  };

  const toggleHelpType = (typeId: string) => {
    setLocalState((prev) => {
      const exists = prev.helpPointTypes.includes(typeId);
      const newTypes = exists
        ? prev.helpPointTypes.filter((t) => t !== typeId)
        : [...prev.helpPointTypes, typeId];
      return { ...prev, helpPointTypes: newTypes };
    });
  };

  const handleApply = () => {
    onApplyFilters(localState);
    onClose();
  };

  const handleReset = () => {
    setLocalState(defaultMapFilters);
    onApplyFilters(defaultMapFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-bold text-white">Map Layer Filters</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close filters"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filter Options */}
        <div className="overflow-y-auto py-4 space-y-5 text-xs pr-1">
          {/* 1. Safety Reports */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Safety Reports
              </span>
              <button
                type="button"
                onClick={() =>
                  setLocalState((p) => ({ ...p, showReports: !p.showReports }))
                }
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition ${
                  localState.showReports
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {localState.showReports ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {localState.showReports && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {reportCategories.map((cat) => {
                  const isChecked = localState.categories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-2 rounded-xl text-left border flex items-center justify-between gap-1.5 transition ${
                        isChecked
                          ? 'bg-blue-600/10 border-blue-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Verified Help Points */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Verified Help Points
              </span>
              <button
                type="button"
                onClick={() =>
                  setLocalState((p) => ({ ...p, showHelpPoints: !p.showHelpPoints }))
                }
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition ${
                  localState.showHelpPoints
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {localState.showHelpPoints ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {localState.showHelpPoints && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {helpTypes.map((ht) => {
                  const isChecked = localState.helpPointTypes.includes(ht.id);
                  return (
                    <button
                      key={ht.id}
                      type="button"
                      onClick={() => toggleHelpType(ht.id)}
                      className={`p-2 rounded-xl text-left border flex items-center justify-between gap-1.5 transition ${
                        isChecked
                          ? 'bg-emerald-600/10 border-emerald-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{ht.icon}</span>
                        <span className="truncate">{ht.label}</span>
                      </span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Safety Concern Hotspots Layer */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">Safety Concern Clusters</span>
                <span className="text-[10px] text-slate-400">
                  Elevated estimated risk & telemetry overlays
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLocalState((p) => ({ ...p, showHotspots: !p.showHotspots }))
                }
                className={`text-[11px] font-semibold px-3 py-1 rounded-xl border transition ${
                  localState.showHotspots
                    ? 'bg-amber-600/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {localState.showHotspots ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition flex items-center justify-center gap-1.5 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-xs shadow-lg shadow-blue-600/30 active:scale-98"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapFilters;
