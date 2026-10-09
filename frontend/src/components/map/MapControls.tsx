import React from 'react';
import { Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import RecenterButton from './RecenterButton';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  hasLocation?: boolean;
  is3D?: boolean;
  onToggle3D?: () => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  isFullscreen = false,
  onToggleFullscreen,
  hasLocation = true,
  is3D = false,
  onToggle3D,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      {/* My Location Button */}
      {hasLocation && <RecenterButton onClick={onRecenter} />}

      {/* Floating Action Stack */}
      <div className="flex flex-col bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl overflow-hidden divide-y divide-slate-800">
        {onToggle3D && (
          <button
            type="button"
            onClick={onToggle3D}
            className={`p-2.5 text-[11px] font-extrabold tracking-wider transition active:scale-95 flex items-center justify-center ${
              is3D
                ? 'bg-emerald-600 text-white shadow-inner'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={is3D ? 'Switch to 2D Top-Down View' : 'Switch to 3D Navigation Perspective'}
            aria-label="Toggle 2D / 3D map perspective"
          >
            {is3D ? '2D' : '3D'}
          </button>
        )}

        <button
          type="button"
          onClick={onZoomIn}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onZoomOut}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default MapControls;
