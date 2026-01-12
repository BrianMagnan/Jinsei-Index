// Helper functions to trigger notifications based on app events
import { sendNotification, canSendNotifications, getNotificationPreferences } from './notifications';

/**
 * Check if a notification type is enabled in preferences
 */
function isNotificationTypeEnabled(type: keyof ReturnType<typeof getNotificationPreferences>): boolean {
  if (!canSendNotifications()) {
    return false;
  }

  const prefs = getNotificationPreferences();
  
  if (!prefs.enabled) {
    return false;
  }

  switch (type) {
    case 'levelUp':
      return prefs.levelUp.enabled;
    case 'achievementUnlocked':
      return prefs.achievementUnlocked.enabled;
    default:
      return false;
  }
}

/**
 * Trigger a level-up notification
 */
export async function notifyLevelUp(
  newLevel: number,
  categoryName?: string,
  skillName?: string
): Promise<void> {
  if (!isNotificationTypeEnabled('levelUp')) {
    return;
  }

  const title = '🎉 Level Up!';
  const body = categoryName && skillName
    ? `You reached level ${newLevel} in ${skillName} (${categoryName})!`
    : categoryName
    ? `You reached level ${newLevel} in ${categoryName}!`
    : `You reached level ${newLevel}!`;

  await sendNotification(title, {
    body,
    tag: 'level_up',
    data: {
      type: 'level_up',
      level: newLevel,
      categoryName,
      skillName,
      url: '/',
    },
  });
}

/**
 * Trigger an achievement unlocked notification
 */
export async function notifyAchievementUnlocked(
  challengeName: string,
  xpReward: number
): Promise<void> {
  if (!isNotificationTypeEnabled('achievementUnlocked')) {
    return;
  }

  const title = '🏆 Achievement Unlocked!';
  const body = `Completed "${challengeName}" and earned ${xpReward} XP!`;

  await sendNotification(title, {
    body,
    tag: 'achievement_unlocked',
    data: {
      type: 'achievement_unlocked',
      challengeName,
      xpReward,
      url: '/',
    },
  });
}

/**
 * Trigger a streak warning notification (called from streak checking logic)
 */
export async function notifyStreakWarning(daysRemaining: number): Promise<void> {
  if (!canSendNotifications()) {
    return;
  }

  const prefs = getNotificationPreferences();
  if (!prefs.enabled || !prefs.streakWarning.enabled) {
    return;
  }

  const title = '🔥 Streak Warning!';
  const body = daysRemaining === 1
    ? 'Your streak will end tomorrow! Complete a challenge today to keep it going!'
    : `Your streak will end in ${daysRemaining} days! Don't let it break!`;

  await sendNotification(title, {
    body,
    tag: 'streak_warning',
    data: {
      type: 'streak_warning',
      daysRemaining,
      url: '/daily',
    },
  });
}

/**
 * Trigger a goal deadline reminder notification
 */
export async function notifyGoalDeadline(
  goalName: string,
  daysUntilDeadline: number
): Promise<void> {
  if (!canSendNotifications()) {
    return;
  }

  const prefs = getNotificationPreferences();
  if (!prefs.enabled || !prefs.goalDeadline.enabled) {
    return;
  }

  // Only notify if within the configured days before deadline
  if (daysUntilDeadline > prefs.goalDeadline.daysBefore) {
    return;
  }

  const title = '⏰ Goal Deadline Approaching!';
  const body = daysUntilDeadline === 0
    ? `"${goalName}" deadline is today!`
    : daysUntilDeadline === 1
    ? `"${goalName}" deadline is tomorrow!`
    : `"${goalName}" deadline is in ${daysUntilDeadline} days!`;

  await sendNotification(title, {
    body,
    tag: 'goal_deadline',
    data: {
      type: 'goal_deadline',
      goalName,
      daysUntilDeadline,
      url: '/',
    },
  });
}
