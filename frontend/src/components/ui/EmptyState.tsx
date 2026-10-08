import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center space-y-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center">
        {icon || <Inbox className="w-6 h-6 text-slate-400" />}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
        {description && <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
