import React from 'react';
import { Shield } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading SafeSphere...',
  className = '',
}) => {
  return (
    <div
      className={`min-h-[200px] p-8 flex flex-col items-center justify-center space-y-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600/30 to-indigo-600/30 border border-slate-700/50 flex items-center justify-center animate-pulse">
          <Shield className="w-6 h-6 text-rose-400" />
        </div>
        <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-2xl animate-spin" />
      </div>
      <span className="text-xs font-medium text-slate-400 tracking-wide">
        {message}
      </span>
    </div>
  );
};

export default LoadingState;
