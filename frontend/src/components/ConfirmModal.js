import React, { useEffect } from 'react';
import Icon from './Icons';

export function ConfirmModal({
  isOpen,
  title = 'Please Confirm',
  message = 'Are you sure you want to proceed with this action?',
  details = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary', // 'primary' | 'danger' | 'success' | 'warning'
  icon = null,
  onConfirm,
  onCancel,
  busy = false
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      } else if (e.key === 'Enter' && !busy && (e.target.tagName !== 'BUTTON' || e.target.classList.contains('btn-confirm'))) {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onCancel, onConfirm]);

  if (!isOpen) return null;

  const defaultIcons = {
    danger: 'trash',
    success: 'checkCircle',
    warning: 'alert',
    primary: 'sparkles'
  };

  const selectedIcon = icon || defaultIcons[variant] || 'alertCircle';

  return (
    <div
      className="modal-backdrop"
      onClick={!busy ? onCancel : undefined}
      role="presentation"
    >
      <div
        className={`modal-dialog confirm-modal modal-variant-${variant}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <button
          className="modal-close-btn"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close dialog"
        >
          <Icon name="x" size={16} />
        </button>

        <div className="confirm-header">
          <div className={`confirm-icon-bubble confirm-icon-${variant}`}>
            <Icon name={selectedIcon} size={24} strokeWidth={2} />
          </div>
          <div className="confirm-title-wrap">
            <h3 id="confirm-modal-title">{title}</h3>
            <p className="confirm-subtitle">{message}</p>
          </div>
        </div>

        {details && (
          <div className="confirm-details-box">
            {details}
          </div>
        )}

        <div className="confirm-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-confirm btn-${variant}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? (
              <>
                <span className="btn-spinner" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{confirmText}</span>
                <Icon name={variant === 'danger' ? 'trash' : 'check'} size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

