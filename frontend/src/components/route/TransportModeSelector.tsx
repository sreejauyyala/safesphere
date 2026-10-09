import React from 'react';
import { Car, Footprints, Bike } from 'lucide-react';

export type TransportProfile = 'driving' | 'two_wheeler' | 'cycling' | 'walking';

interface TransportModeSelectorProps {
  selectedProfile: TransportProfile;
  onChange: (profile: TransportProfile) => void;
  disabled?: boolean;
}

export const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedProfile,
  onChange,
  disabled = false,
}) => {
  const modes: {
    id: TransportProfile;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'driving',
      label: 'Car',
      sublabel: 'Drive',
      icon: <Car className="w-4 h-4" />,
      color: 'blue',
    },
    {
      id: 'two_wheeler',
      label: 'Scooty / Motorcycle',
      sublabel: '2-Wheeler',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19.44 13c-.22 0-.45.02-.67.06l-1.39-3.47A3.99 3.99 0 0 0 13.62 7H11V5h2V3h-4v2h1v2H7.4a2 2 0 0 0-1.9 1.37L3.63 13.9A4.5 4.5 0 0 0 4.5 22 4.5 4.5 0 0 0 9 17.5c0-.62-.13-1.21-.36-1.74l1.24-2.76h3.24l1.24 2.76c-.23.53-.36 1.12-.36 1.74a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0-4.5-4.5zM4.5 20a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5c.67 0 1.28.27 1.73.71L4.85 18H7a2.5 2.5 0 0 1-2.5 2zm15 0a2.5 2.5 0 0 1-2.5-2.5c0-.79.37-1.49.95-1.95l1.43 2.15 1.66-1.11-1.44-2.16c.43.34.8.79 1.02 1.32.24.53.38 1.12.38 1.75a2.5 2.5 0 0 1-2.5 2.5z" />
        </svg>
      ),
      color: 'amber',
    },
    {
      id: 'cycling',
      label: 'Bicycle',
      sublabel: 'Cycle',
      icon: <Bike className="w-4 h-4" />,
      color: 'emerald',
    },
    {
      id: 'walking',
      label: 'Walking',
      sublabel: 'Walk',
      icon: <Footprints className="w-4 h-4" />,
      color: 'cyan',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Transport Mode
        </label>
        <span className="text-[10px] text-slate-500">
          Recalculates instantly
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
        {modes.map((m) => {
          const isActive = selectedProfile === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(m.id)}
              title={m.label}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all font-semibold text-xs relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              <div className="mb-1">{m.icon}</div>
              <span className="text-[11px] font-bold leading-tight truncate max-w-full">
                {m.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TransportModeSelector;
