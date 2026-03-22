import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import NotificationDialog from './NotificationDialog';
import { Store } from 'react-notifications-component';
import { API_BASE_URL } from '../config';

// Play notification sound
const playNotificationSound = () => {
  try {
    // Create audio context for a simple beep sound
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return; // Audio not supported
    }

    let audioContext = new AudioContextClass();
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // If resume fails, sound won't play (browser restriction)
        return;
      });
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure the beep sound (pleasant notification sound)
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';

    // Fade in and out for a pleasant sound
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);

    // Clean up after sound finishes
    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch (error) {
    // Silently fail if sound can't be played (e.g., autoplay restriction)
    // User will still see the popup notification
  }
};

const RealTimeNotificationHandler = ({ onNotificationCountChange }) => {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const [currentNotification, setCurrentNotification] = useState(null);
  const lastNotificationIdsRef = useRef(new Set());
  const lastUnreadCountRef = useRef(0);
  const pollingIntervalRef = useRef(null);
  const isCheckingRef = useRef(false);

  // Important notification types that should trigger popups
  const importantNotificationTypes = [
    'contract_approved',
    'contract_denied',
    'document_approved',
    'document_rejected'
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Initial check
    checkForNewNotifications();

    // Poll for new notifications every 15 seconds (more frequent than the bell)
    pollingIntervalRef.current = setInterval(() => {
      checkForNewNotifications();
    }, 15000); // 15 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isAuthenticated, getAuthHeaders]);

  const checkForNewNotifications = async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) {
      return;
    }

    // Don't check if a dialog is already open
    if (currentNotification) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const headers = getAuthHeaders();
      
      // First check the count to see if there are new notifications
      const countResponse = await axios.get(
        `${API_BASE_URL}/portallogistice/notifications/count`,
        { headers }
      );

      if (countResponse.data?.success) {
        const unreadCount = countResponse.data.data.unread_count || 0;
        
        // Only fetch notifications if count increased
        if (unreadCount > lastUnreadCountRef.current) {
          // Fetch latest unread notifications
          const notificationsResponse = await axios.get(
            `${API_BASE_URL}/portallogistice/notifications?read=false&per_page=10`,
            { headers }
          );

          if (notificationsResponse.data?.success) {
            const notifications = notificationsResponse.data.data.notifications || [];
            
            // Find the most recent important notification that hasn't been shown
            const shownNotificationIds = JSON.parse(
              sessionStorage.getItem('shown_popup_notifications') || '[]'
            );

            // Find new important notifications
            const newImportantNotification = notifications
              .filter(n => 
                importantNotificationTypes.includes(n.type) &&
                !shownNotificationIds.includes(n.id) &&
                !lastNotificationIdsRef.current.has(n.id)
              )
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

            if (newImportantNotification) {
              // Mark as shown in session storage
              const updatedShownIds = [...shownNotificationIds, newImportantNotification.id];
              sessionStorage.setItem('shown_popup_notifications', JSON.stringify(updatedShownIds));
              
              // Add to last seen ref
              lastNotificationIdsRef.current.add(newImportantNotification.id);
              
              // Play sound
              playNotificationSound();
              
              // Show dialog
              setCurrentNotification(newImportantNotification);

              // Also show a toast notification
              const notificationTypes = {
                contract_approved: { title: 'Contract Approved', titleAr: 'تم الموافقة على العقد' },
                contract_denied: { title: 'Contract Refused', titleAr: 'تم رفض العقد' },
                document_approved: { title: 'Document Approved', titleAr: 'تم الموافقة على المستند' },
                document_rejected: { title: 'Document Rejected', titleAr: 'تم رفض المستند' }
              };

              const typeInfo = notificationTypes[newImportantNotification.type] || {};
              
              Store.addNotification({
                title: typeInfo.title || 'New Notification',
                message: newImportantNotification.description_en || newImportantNotification.description || '',
                type: newImportantNotification.type.includes('approved') ? 'success' : 'danger',
                insert: 'top',
                container: 'top-right',
                dismiss: { duration: 5000 }
              });
            }
          }

          // Update last count
          lastUnreadCountRef.current = unreadCount;
        } else if (unreadCount < lastUnreadCountRef.current) {
          // Count decreased, user might have read notifications
          // Reset the tracking to allow showing notifications again
          lastUnreadCountRef.current = unreadCount;
        }

        // Notify parent component about count change
        if (onNotificationCountChange) {
          onNotificationCountChange({
            unread: unreadCount,
            urgent: countResponse.data.data.urgent_count || 0
          });
        }
      }
    } catch (error) {
      // Silently fail - don't disturb user experience
      console.error('Error checking for new notifications:', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  const handleCloseDialog = () => {
    setCurrentNotification(null);
  };

  const handleMarkAsRead = async () => {
    if (!currentNotification?.id) return;

    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/portallogistice/notifications/${currentNotification.id}/read`,
        {},
        { headers }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Clean up shown notifications on page unload (keep only last 50 to prevent storage bloat)
  useEffect(() => {
    const cleanup = () => {
      const shownIds = JSON.parse(sessionStorage.getItem('shown_popup_notifications') || '[]');
      if (shownIds.length > 50) {
        sessionStorage.setItem('shown_popup_notifications', JSON.stringify(shownIds.slice(-50)));
      }
    };

    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);

  if (!currentNotification) {
    return null;
  }

  return (
    <NotificationDialog
      notification={currentNotification}
      onClose={handleCloseDialog}
      onMarkAsRead={handleMarkAsRead}
    />
  );
};

export default RealTimeNotificationHandler;
