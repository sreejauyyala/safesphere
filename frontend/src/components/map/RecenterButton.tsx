import React from 'react';
import { LocateFixed } from 'lucide-react';

interface RecenterButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const RecenterButton: React.FC<RecenterButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-slate-100 border border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Recenter map on your live GPS position"
      aria-label="Recenter on my location"
    >
      <LocateFixed className="w-4 h-4 text-blue-400" />
      <span>My Location</span>
    </button>
  );
};

export default RecenterButton;
