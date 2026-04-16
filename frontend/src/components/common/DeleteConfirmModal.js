import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title,
  message,
  details,
  warningMessage,
  confirmButtonText = 'Delete',
  type = 'danger' // danger, warning, info
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          headerBg: '#fff3cd',
          headerBorder: '#ffc107',
          headerColor: '#856404',
          iconColor: '#ffc107'
        };
      case 'info':
        return {
          headerBg: '#d1ecf1',
          headerBorder: '#0dcaf0',
          headerColor: '#055160',
          iconColor: '#0dcaf0'
        };
      default: // danger
        return {
          headerBg: '#f8d7da',
          headerBorder: '#dc3545',
          headerColor: '#721c24',
          iconColor: '#dc3545'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 1050,
        overflow: 'auto',
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          margin: '3rem auto',
          maxWidth: '540px',
          animation: 'modalSlideIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: typeStyles.headerBg,
              borderBottom: `3px solid ${typeStyles.headerBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={28} color={typeStyles.iconColor} strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <h5
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: typeStyles.headerColor,
                  letterSpacing: '-0.01em'
                }}
              >
                {title}
              </h5>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              style={{
                background: 'none',
                border: 'none',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                padding: '0.25rem',
                opacity: isDeleting ? 0.5 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              <X size={24} color={typeStyles.headerColor} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            <p
              style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1rem',
                color: '#495057',
                lineHeight: '1.6'
              }}
            >
              {message}
            </p>

            {/* Details Card */}
            {details && details.length > 0 && (
              <div
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #dee2e6'
                }}
              >
                {details.map((detail, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: index === details.length - 1 ? 0 : '0.75rem',
                      paddingBottom: index === details.length - 1 ? 0 : '0.75rem',
                      borderBottom:
                        index === details.length - 1 ? 'none' : '1px solid #dee2e6'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.9rem',
                        color: '#6c757d',
                        fontWeight: '600'
                      }}
                    >
                      {detail.label}:
                    </span>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        color: detail.highlight ? '#dc3545' : '#212529',
                        fontWeight: detail.highlight ? '700' : '600',
                        maxWidth: '60%',
                        textAlign: 'right',
                        wordBreak: 'break-word'
                      }}
                    >
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Warning Message */}
            {warningMessage && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#fff3cd',
                  border: '2px solid #ffc107',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'start'
                }}
              >
                <AlertTriangle
                  size={20}
                  color="#856404"
                  style={{ flexShrink: 0, marginTop: '0.1rem' }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: '#856404',
                    fontWeight: '600',
                    lineHeight: '1.5'
                  }}
                >
                  {warningMessage}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '2px solid #6c757d',
                backgroundColor: '#fff',
                color: '#6c757d',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
                transition: 'all 0.2s',
                minWidth: '100px'
              }}
              onMouseEnter={(e) => {
                if (!isDeleting) {
                  e.target.style.backgroundColor = '#6c757d';
                  e.target.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.color = '#6c757d';
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '700',
                borderRadius: '6px',
                border: '2px solid #dc3545',
                backgroundColor: '#dc3545',
                color: '#fff',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.7 : 1,
                transition: 'all 0.2s',
                minWidth: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!isDeleting) {
                  e.target.style.backgroundColor = '#bb2d3b';
                  e.target.style.borderColor = '#bb2d3b';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dc3545';
                e.target.style.borderColor = '#dc3545';
              }}
            >
              {isDeleting ? (
                <>
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }}
                  />
                  Deleting...
                </>
              ) : (
                confirmButtonText
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default DeleteConfirmModal;
