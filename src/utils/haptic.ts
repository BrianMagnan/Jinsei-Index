/**
 * Haptic Feedback Utility
 * Provides vibration feedback for mobile devices using the Vibration API
 */

// Check if haptic feedback is supported
const isHapticSupported = (): boolean => {
  return "vibrate" in navigator;
};

/**
 * Haptic feedback patterns
 */
export const HapticPattern = {
  // Light tap (10ms)
  light: [10],
  // Medium tap (20ms)
  medium: [20],
  // Heavy tap (30ms)
  heavy: [30],
  // Success pattern (short-short-long)
  success: [10, 50, 20],
  // Error pattern (long-short-long)
  error: [30, 50, 30],
  // Navigation (double tap)
  navigation: [15, 50, 15],
  // Selection (triple tap)
  selection: [10, 50, 10, 50, 10],
} as const;

/**
 * Trigger haptic feedback
 * @param pattern - Vibration pattern in milliseconds
 */
export const haptic = (pattern: number | number[] = [10]): void => {
  if (!isHapticSupported()) {
    return; // Silently fail if not supported
  }

  try {
    // Convert readonly array to mutable array if needed
    const patternArray = Array.isArray(pattern) ? [...pattern] : pattern;
    navigator.vibrate(patternArray);
  } catch (error) {
    // Silently fail if vibration fails
    console.debug("Haptic feedback not available:", error);
  }
};

/**
 * Convenience functions for common haptic patterns
 */
export const hapticFeedback = {
  light: () => haptic([...HapticPattern.light]),
  medium: () => haptic([...HapticPattern.medium]),
  heavy: () => haptic([...HapticPattern.heavy]),
  success: () => haptic([...HapticPattern.success]),
  error: () => haptic([...HapticPattern.error]),
  navigation: () => haptic([...HapticPattern.navigation]),
  selection: () => haptic([...HapticPattern.selection]),
};

