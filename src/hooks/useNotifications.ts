// React hook for managing notifications
import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  canSendNotifications,
  sendNotification,
  rescheduleAllNotifications,
  type NotificationPreferences,
} from '../utils/notifications';

export interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  preferences: NotificationPreferences;
  canSend: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  send: (title: string, options?: NotificationOptions) => Promise<void>;
  enable: () => void;
  disable: () => void;
}

/**
 * Hook for managing browser notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const isSupported = isNotificationSupported();
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    getNotificationPreferences()
  );
  const [canSend, setCanSend] = useState(canSendNotifications());

  // Update permission status when it changes
  useEffect(() => {
    const checkPermission = () => {
      setPermission(getNotificationPermission());
      setCanSend(canSendNotifications());
    };

    // Check permission on mount
    checkPermission();

    // Listen for permission changes (some browsers support this)
    // Note: Most browsers don't fire events for permission changes,
    // so we check periodically or on user interaction
    const interval = setInterval(checkPermission, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update canSend when preferences change
  useEffect(() => {
    setCanSend(canSendNotifications());
  }, [preferences, permission]);

  const requestPermission = useCallback(async () => {
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      setCanSend(canSendNotifications());
      
      // If permission granted, enable notifications by default
      if (newPermission === 'granted' && !preferences.enabled) {
        updatePreferences({ enabled: true });
      }
      
      return newPermission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }, [preferences.enabled]);

  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    saveNotificationPreferences(updated);
    
    // Re-schedule notifications if they're enabled
    if (updated.enabled && permission === 'granted') {
      rescheduleAllNotifications();
    }
  }, [preferences, permission]);

  const send = useCallback(async (title: string, options?: NotificationOptions) => {
    await sendNotification(title, options);
  }, []);

  const enable = useCallback(() => {
    updatePreferences({ enabled: true });
  }, [updatePreferences]);

  const disable = useCallback(() => {
    updatePreferences({ enabled: false });
  }, [updatePreferences]);

  return {
    isSupported,
    permission,
    preferences,
    canSend,
    requestPermission,
    updatePreferences,
    send,
    enable,
    disable,
  };
}
