import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../Context/AuthContext';
import { API_BASE_URL } from '../config';
import { getLang, pickFieldText } from '../Utitlities/uxText';

const NotificationDialog = ({ notification, onClose, onMarkAsRead }) => {
  const { t, i18n } = useTranslation(['common']);
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const lang = getLang(i18n);
  const isArabic = lang === 'ar';

  // Determine notification type and styling
  const isApproval = notification.type === 'document_approved' || notification.type === 'contract_approved';
  const isRejection = notification.type === 'document_rejected' || notification.type === 'contract_denied';
  const isUrgent = notification.priority === 'urgent';

  // Icon configuration
  const getIconConfig = () => {
    if (isApproval) {
      return {
        icon: 'fa-check-circle',
        bgColor: '#d1fae5',
        iconColor: '#10b981',
        borderColor: '#a7f3d0'
      };
    } else if (isRejection) {
      return {
        icon: 'fa-exclamation-triangle',
        bgColor: '#fee2e2',
        iconColor: '#ef4444',
        borderColor: '#fecaca'
      };
    } else if (isUrgent) {
      return {
        icon: 'fa-exclamation-circle',
        bgColor: '#fef3c7',
        iconColor: '#f59e0b',
        borderColor: '#fde68a'
      };
    } else {
      return {
        icon: 'fa-bell',
        bgColor: '#dbeafe',
        iconColor: '#3b82f6',
        borderColor: '#bfdbfe'
      };
    }
  };

  const iconConfig = getIconConfig();

  // Get notification text
  const title = pickFieldText(lang, notification, ['title_ar', 'title'], ['title_en', 'title'], t('dashboard.notifications.title'));
  const description = pickFieldText(lang, notification, ['description_ar', 'description'], ['description_en', 'description'], '');

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
      if (notification.type === 'document_rejected' || notification.type === 'document_approved') {
        navigate('/dashboard/profile');
      } else if (notification.type === 'contract_denied' || notification.type === 'contract_approved') {
        navigate('/dashboard/contracts');
      } else {
        navigate('/dashboard/notifications');
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

  return (
    <div 
      className="modal-overlay notification-dialog-overlay" 
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
        padding: '20px',
        animation: 'fadeIn 0.3s ease-in'
      }}
    >
      <div 
        className="modal-content notification-dialog-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          animation: 'slideUp 0.3s ease-out'
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
            backgroundColor: iconConfig.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className={`fas ${iconConfig.icon}`} style={{ color: iconConfig.iconColor, fontSize: '24px' }}></i>
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
            backgroundColor: isApproval ? '#f0fdf4' : isRejection ? '#fef2f2' : '#f9fafb',
            border: `1px solid ${iconConfig.borderColor}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <i className={`fas ${isApproval ? 'fa-check-circle' : isRejection ? 'fa-info-circle' : 'fa-bell'}`} 
                 style={{ 
                   color: iconConfig.iconColor, 
                   fontSize: '20px', 
                   marginTop: '2px' 
                 }}></i>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: isApproval ? '#065f46' : isRejection ? '#991b1b' : '#374151',
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
                  {notification.contract_number || notification.related_contract?.contract_number || notification.related_contract?.id || notification.contract_id}
                </strong>
              </p>
            </div>
          )}

          {notification.deadline && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-clock" style={{ color: '#f59e0b' }}></i>
              <span style={{
                fontSize: '14px',
                color: '#92400e',
                fontFamily: '"Cairo", sans-serif'
              }}>
                {isArabic ? 'الموعد النهائي: ' : 'Deadline: '}
                {new Date(notification.deadline).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
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
          {(notification.action_url || isRejection || isApproval) && (
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
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationDialog;
