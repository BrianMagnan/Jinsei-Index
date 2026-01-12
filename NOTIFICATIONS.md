# Smart Notifications Implementation Guide

This document explains how the smart notification system works and how to use it in the Jinsei Index app.

## Overview

The notification system provides:

- **Browser notifications** for important events
- **Scheduled reminders** for daily challenges
- **Smart notifications** based on user preferences
- **Notification settings UI** for customization

## Architecture

### Components

1. **`src/utils/notifications.ts`** - Core notification utilities

   - Permission management
   - Preference storage
   - Notification scheduling
   - Service worker integration

2. **`src/hooks/useNotifications.ts`** - React hook for notifications

   - State management
   - Preference updates
   - Permission requests

3. **`src/components/NotificationSettings.tsx`** - Settings UI component

   - User-friendly settings interface
   - Permission requests
   - Preference configuration

4. **`src/utils/notificationTriggers.ts`** - Event-based triggers

   - Level-up notifications
   - Achievement notifications
   - Streak warnings
   - Goal deadline reminders

5. **`public/sw.js`** - Service worker
   - Handles notification clicks
   - Manages notification display

## Usage

### 1. Adding Notification Settings to Your App

Add the `NotificationSettings` component to your settings/profile page:

```tsx
import { NotificationSettings } from "./components/NotificationSettings";

// In your settings/profile view
<NotificationSettings />;
```

### 2. Triggering Notifications on Events

#### When a challenge is completed:

```tsx
import { notifyAchievementUnlocked } from "./utils/notificationTriggers";

// After creating an achievement
await achievementAPI.create({ challenge: challengeId });
const challenge = await challengeAPI.getById(challengeId);

// Trigger notification
await notifyAchievementUnlocked(challenge.name, challenge.xpReward);
```

#### When a level-up occurs:

```tsx
import { notifyLevelUp } from "./utils/notificationTriggers";

// Check for level-up after XP gain
const oldLevel = skill.level;
await skill.addXP(xpReward);
const newLevel = skill.level;

if (newLevel > oldLevel) {
  await notifyLevelUp(newLevel, categoryName, skillName);
}
```

#### For streak warnings:

```tsx
import { notifyStreakWarning } from "./utils/notificationTriggers";

// When checking daily list completion
if (hasActiveStreak && !completedToday) {
  const daysRemaining = calculateDaysUntilStreakBreaks();
  await notifyStreakWarning(daysRemaining);
}
```

### 3. Manual Notification Sending

```tsx
import { useNotifications } from "./hooks/useNotifications";

function MyComponent() {
  const { send, canSend } = useNotifications();

  const handleCustomEvent = async () => {
    if (canSend) {
      await send("Custom Title", {
        body: "Custom notification message",
        tag: "custom_event",
        data: { url: "/custom-path" },
      });
    }
  };
}
```

## Notification Types

### Daily Reminder

- **Trigger**: Scheduled at a specific time (default 9:00 AM)
- **Purpose**: Remind users to check their daily challenges
- **Scheduling**: Automatic, re-schedules daily

### Streak Warning

- **Trigger**: Scheduled at a specific time (default 8:00 PM)
- **Purpose**: Warn users if they haven't completed a daily challenge
- **Requires**: Streak tracking implementation

### Level Up

- **Trigger**: When XP increases result in a level increase
- **Purpose**: Celebrate user progress
- **Implementation**: Check level before/after XP gain

### Achievement Unlocked

- **Trigger**: When a challenge is completed
- **Purpose**: Celebrate challenge completion
- **Implementation**: After achievement creation

### Goal Deadline

- **Trigger**: When a goal deadline is approaching
- **Purpose**: Remind users about upcoming deadlines
- **Requires**: Goal system implementation

## Preferences Structure

```typescript
interface NotificationPreferences {
  enabled: boolean; // Master switch
  dailyReminder: {
    enabled: boolean;
    time: string; // HH:mm format
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
    daysBefore: number;
  };
  achievementUnlocked: {
    enabled: boolean;
  };
}
```

## Browser Compatibility

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop)
- ✅ Safari (Desktop & iOS 16.4+)
- ⚠️ Older browsers may have limited support

## Permissions

Users must grant notification permission. The system:

1. Checks if notifications are supported
2. Requests permission when needed
3. Handles denied permissions gracefully
4. Re-schedules notifications when preferences change

## Service Worker Integration

Notifications are sent through the service worker for:

- Better offline support
- Persistent notifications
- Click handling to navigate to the app

Clicking a notification will:

1. Focus/open the app window
2. Navigate to the relevant URL (if specified in notification data)

## Scheduling Details

### Daily Notifications

- Scheduled using `setTimeout`
- Automatically re-schedules after firing
- Resets on page load if needed
- Stored in localStorage for persistence

### Limitations

- Browser may throttle notifications
- Notifications won't fire if browser is closed (desktop)
- Mobile notifications require service worker support

## Testing

### Development

1. Enable notifications in your browser settings
2. Grant permission when prompted
3. Check browser console for scheduling logs
4. Use browser DevTools > Application > Service Workers to debug

### Production

- Test on actual devices
- Verify permission requests work correctly
- Test notification clicks navigate properly
- Verify scheduling persists across sessions

## Troubleshooting

### Notifications not appearing

- Check browser notification settings
- Verify permission is granted
- Check if notifications are enabled in preferences
- Ensure service worker is registered

### Notifications not scheduling

- Check browser console for errors
- Verify time format is correct (HH:mm)
- Check if notifications are enabled
- Refresh page to re-initialize

### Permission denied

- User must enable in browser settings
- Clear site data and re-request
- Check browser-specific notification policies

## Future Enhancements

Potential improvements:

- Push notifications via web push API
- Backend scheduling for reliable notifications
- Rich notifications with images
- Action buttons in notifications
- Notification grouping
- Analytics tracking
