// Orientation lock utility for mobile devices

// Extend Screen interface for orientation lock API
interface ScreenOrientationLock extends ScreenOrientation {
  lock?(orientation: 'portrait' | 'landscape' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary' | 'natural'): Promise<void>;
}

/**
 * Lock screen orientation to portrait on mobile devices
 * Uses 'portrait-primary' for better compatibility
 */
export function lockOrientationToPortrait(): void {
  // Check if we're on a mobile device
  const isMobile = 
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0);

  if (!isMobile) {
    return; // Don't lock on desktop
  }

  // Try to lock orientation using Screen Orientation API
  const orientation = screen.orientation as ScreenOrientationLock;
  if (orientation && typeof orientation.lock === 'function') {
    const lockFn = orientation.lock;
    // Try portrait-primary first (more specific, better support)
    lockFn('portrait-primary').catch(() => {
      // Fallback to portrait if portrait-primary fails
      if (typeof lockFn === 'function') {
        lockFn('portrait').catch((error: Error) => {
          // Lock may fail if not in fullscreen or without user gesture
          // This is expected behavior - we'll handle it gracefully
          console.log('[OrientationLock] Could not lock orientation:', error.message);
        });
      }
    });
  } 
  // Fallback for older browsers
  else if ((screen as any).lockOrientation) {
    try {
      (screen as any).lockOrientation('portrait');
    } catch (e) {
      // Silently fail
    }
  } 
  // Another fallback
  else if ((screen as any).mozLockOrientation) {
    try {
      (screen as any).mozLockOrientation('portrait');
    } catch (e) {
      // Silently fail
    }
  } 
  else if ((screen as any).msLockOrientation) {
    try {
      (screen as any).msLockOrientation('portrait');
    } catch (e) {
      // Silently fail
    }
  }
}

/**
 * Unlock screen orientation
 */
export function unlockOrientation(): void {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  } else if ((screen as any).unlockOrientation) {
    (screen as any).unlockOrientation();
  } else if ((screen as any).mozUnlockOrientation) {
    (screen as any).mozUnlockOrientation();
  } else if ((screen as any).msUnlockOrientation) {
    (screen as any).msUnlockOrientation();
  }
}
