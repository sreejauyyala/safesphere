import React from 'react';
import { Bell, Check, X, ShieldAlert, HeartHandshake, CheckCircle2, Navigation } from 'lucide-react';
import type { MockNotificationItem } from '../../mock/demoData';

export interface NotificationPanelProps {
  notifications: MockNotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: MockNotificationItem['type']) => {
    switch (type) {
      case 'guardian':
        return <HeartHandshake className="w-4 h-4 text-purple-400" />;
      case 'report':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'journey':
        return <Navigation className="w-4 h-4 text-blue-400" />;
      case 'alert':
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-transparent" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Panel Dropdown */}
      <div
        className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl glass-panel border border-slate-800 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150"
        role="dialog"
        aria-label="Notifications Panel"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Safety Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded"
                title="Mark all as read"
              >
                <Check className="w-3 h-3" />
                <span>Mark Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No notifications at this time.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border text-xs transition-colors flex items-start gap-3 relative ${
                  notif.read
                    ? 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-100'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-slate-800 shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-200 truncate text-xs">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                      {notif.timeAgo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                </div>
                {onDismiss && (
                  <button
                    type="button"
                    onClick={() => onDismiss(notif.id)}
                    className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Note */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
          ⚡ Push notifications connect to Firebase Cloud Messaging (FCM) in later modules.
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
