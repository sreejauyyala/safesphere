import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'panel' | 'card' | 'interactive';
  glow?: 'none' | 'blue' | 'rose' | 'emerald';
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'panel',
  glow = 'none',
  title,
  subtitle,
  icon,
  action,
  footer,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-3xl border transition-all';
  
  const variantClasses = {
    panel: 'glass-panel border-slate-800 shadow-xl',
    card: 'glass-card border-slate-800/80 shadow-md',
    interactive: 'glass-card border-slate-800/80 hover:border-slate-700 hover:scale-[1.01] cursor-pointer shadow-md',
  };

  const glowClasses = {
    none: '',
    blue: 'glow-blue',
    rose: 'glow-rose',
    emerald: 'glow-emerald',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${glowClasses[glow]} p-5 sm:p-6 ${className}`}
      {...props}
    >
      {(title || icon || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-bold text-slate-100">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
