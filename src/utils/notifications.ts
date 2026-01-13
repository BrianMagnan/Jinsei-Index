// Notification utilities for browser notifications
// Supports requesting permissions, scheduling, and managing notifications

export type NotificationType = 
  | 'daily_reminder' 
  | 'streak_warning' 
  | 'level_up' 
  | 'goal_deadline'
  | 'achievement_unlocked';

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminder: {
    enabled: boolean;
    time: string; // HH:mm format (24-hour)
  };
  streakWarning: {
    enabled: boolean;
    time: string; // HH:mm format
  };
  levelUp: {
    enabled: boolean;
  };
  goalDeadline: {
    enabled: boolean;
    daysBefore: number; // How many days before deadline to notify
  };
  achievementUnlocked: {
    enabled: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  dailyReminder: {
    enabled: true,
    time: '09:00', // 9 AM default
  },
  streakWarning: {
    enabled: true,
    time: '20:00', // 8 PM default
  },
  levelUp: {
    enabled: true,
  },
  goalDeadline: {
    enabled: true,
    daysBefore: 1,
  },
  achievementUnlocked: {
    enabled: true,
  },
};

const NOTIFICATION_PREFS_KEY = 'notificationPreferences';

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was previously denied. Please enable it in your browser settings.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const prefsStr = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (prefsStr) {
      return JSON.parse(prefsStr);
    }
  } catch (error) {
    // Failed to load notification preferences
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    // Failed to save notification preferences
  }
}

/**
 * Check if notifications are enabled and permission is granted
 */
export function canSendNotifications(): boolean {
  const prefs = getNotificationPreferences();
  return prefs.enabled && Notification.permission === 'granted';
}

/**
 * Send a notification immediately
 */
export async function sendNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!canSendNotifications()) {
    return;
  }

  // Try to use service worker for better support
  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification(title, {
    badge: '/icon-192.png',
    icon: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'jinsei-notification',
    requireInteraction: false,
    ...options,
  } as NotificationOptions & { vibrate?: number[] });
}

/**
 * Schedule a daily notification at a specific time
 */
export function scheduleDailyNotification(
  time: string, // HH:mm format
  title: string,
  options?: NotificationOptions
): void {
  if (!canSendNotifications()) {
    return;
  }

  // Parse time (HH:mm)
  const [hours, minutes] = time.split(':').map(Number);
  
  // Calculate time until next occurrence
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  // Schedule using setTimeout
  // Note: Timeout IDs are stored in memory only and will be lost on page reload
  // This is a limitation of browser-based scheduling without push notifications
  const timeoutId = setTimeout(async () => {
    await sendNotification(title, options);
    // Re-schedule for next day
    scheduleDailyNotification(time, title, options);
  }, delay);

  // Store timeout ID in memory for cancellation
  // We can't serialize timeout IDs, so they're only stored in memory
  if (!(window as any).__notificationTimeouts) {
    (window as any).__notificationTimeouts = new Map();
  }
  (window as any).__notificationTimeouts.set(`daily_${time}`, timeoutId);
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(id: string): void {
  if ((window as any).__notificationTimeouts) {
    const timeoutId = (window as any).__notificationTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      (window as any).__notificationTimeouts.delete(id);
    }
  }
}

/**
 * Cancel all scheduled notifications
 */
export function cancelAllScheduledNotifications(): void {
  if ((window as any).__notificationTimeouts) {
    (window as any).__notificationTimeouts.forEach((timeoutId: ReturnType<typeof setTimeout>) => {
      clearTimeout(timeoutId);
    });
    (window as any).__notificationTimeouts.clear();
  }
}

// Scheduled notifications are stored in memory only (timeout IDs can't be serialized)
// They will be re-scheduled on page load via rescheduleAllNotifications()

/**
 * Re-schedule all notifications based on preferences
 * Call this on app load and when preferences change
 */
export function rescheduleAllNotifications(): void {
  // Cancel existing notifications
  cancelAllScheduledNotifications();

  if (!canSendNotifications()) {
    return;
  }

  const prefs = getNotificationPreferences();

  // Schedule daily reminder
  if (prefs.dailyReminder.enabled) {
    scheduleDailyNotification(
      prefs.dailyReminder.time,
      '📋 Daily Challenge Reminder',
      {
        body: 'Time to check your daily challenges!',
        tag: 'daily_reminder',
      }
    );
  }

  // Schedule streak warning (if user has an active streak)
  // This would need to check with the backend for streak data
  // For now, we'll just set it up
  if (prefs.streakWarning.enabled) {
    // This would check streak status and schedule accordingly
    // Implementation depends on streak feature
  }
}

/**
 * Initialize notifications - call this on app startup
 */
export async function initializeNotifications(): Promise<void> {
  if (!isNotificationSupported()) {
    return;
  }

  // Re-schedule all notifications based on current preferences
  rescheduleAllNotifications();
}
