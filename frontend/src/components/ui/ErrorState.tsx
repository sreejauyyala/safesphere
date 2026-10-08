import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-100">{title}</h4>
        <p className="text-xs text-rose-300/80 mt-1 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-2 text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
