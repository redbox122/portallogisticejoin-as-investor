import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../Context/AuthContext';
import { API_BASE_URL } from '../config';

const RefusalNotificationDialog = ({ notification, onClose, onMarkAsRead }) => {
  const { t, i18n } = useTranslation(['common']);
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const isArabic = i18n.language === 'ar';

  const handleTakeAction = () => {
    // Mark as read first
    if (onMarkAsRead) {
      onMarkAsRead();
    }
    
    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      // Default navigation based on type
      if (notification.type === 'document_rejected') {
        navigate('/dashboard/profile');
      } else if (notification.type === 'contract_denied') {
        navigate('/dashboard/contracts');
      }
    }
    
    onClose();
  };

  const handleDismiss = async () => {
    // Mark as read
    if (onMarkAsRead) {
      onMarkAsRead();
    }
    
    // Also mark as dismissed via API if it has an ID
    if (notification.id) {
      try {
        const headers = getAuthHeaders();
        await axios.put(
          `${API_BASE_URL}/portallogistice/notifications/${notification.id}/dismiss`,
          {},
          { headers }
        );
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    }
    
    onClose();
  };

  const title = isArabic ? notification.title : (notification.title_en || notification.title);
  const description = isArabic ? notification.description : (notification.description_en || notification.description);

  return (
    <div 
      className="modal-overlay" 
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="modal-header" style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: '24px' }}></i>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              fontFamily: '"Cairo", sans-serif'
            }}>
              {title}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#6b7280',
              fontFamily: '"Cairo", sans-serif'
            }}>
              {isArabic ? 'إشعار جديد' : 'New Notification'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
              e.target.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#9ca3af';
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body" style={{
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <i className="fas fa-info-circle" style={{ color: '#dc2626', fontSize: '20px', marginTop: '2px' }}></i>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#991b1b',
                  fontFamily: '"Cairo", sans-serif',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {description}
                </p>
              </div>
            </div>
          </div>

          {notification.related_contract && (
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280',
                fontFamily: '"Cairo", sans-serif'
              }}>
                {isArabic ? 'عقد رقم' : 'Contract #'}{' '}
                <strong style={{ color: '#1f2937' }}>
                  {notification.related_contract.contract_number || notification.related_contract.id}
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleDismiss}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Cairo", sans-serif',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
          <button
            onClick={handleTakeAction}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#073491',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Cairo", sans-serif',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#062a7a';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#073491';
            }}
          >
            {isArabic ? 'اتخاذ إجراء' : 'Take Action'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefusalNotificationDialog;
