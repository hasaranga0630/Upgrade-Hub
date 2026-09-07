import React from 'react';
import Icon from './Icons';

export function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  const iconMap = {
    success: 'checkCircle',
    error: 'alertCircle',
    warning: 'alert',
    info: 'info'
  };

  return (
    <div className="toast-portal" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const type = toast.type || 'info';
        const iconName = iconMap[type] || 'info';

        return (
          <div
            key={toast.id}
            className={`toast-card toast-${type}`}
            role={type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            <div className="toast-icon-wrapper">
              <Icon name={iconName} size={18} strokeWidth={2.2} />
            </div>

            <div className="toast-body">
              {toast.title && <strong className="toast-title">{toast.title}</strong>}
              <p className="toast-message">{toast.message}</p>
            </div>

            <button
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Close notification"
            >
              <Icon name="x" size={14} />
            </button>

            {toast.duration && (
              <div
                className="toast-progress-bar"
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;

