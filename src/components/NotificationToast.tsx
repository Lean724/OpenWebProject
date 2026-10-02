/**
 * OpenWebProject - Notification Toast Component
 * Clean, non-intrusive feedback for offline domain operations.
 */
import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationToastProps {
  notification: { message: string; type: 'info' | 'success' | 'warning' | 'error' } | null;
  onClose?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  const icons = {
    info: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
  };

  const borderStyles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-md text-xs font-medium ${borderStyles[notification.type]}`}>
        {icons[notification.type]}
        <span className="flex-1">{notification.message}</span>
        {onClose && (
          <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
