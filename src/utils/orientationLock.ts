// Orientation lock utility for mobile devices

// Extend Screen interface for orientation lock API
interface ScreenOrientationLock extends ScreenOrientation {
  lock?(orientation: 'portrait' | 'landscape' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary' | 'natural'): Promise<void>;
}

let lockAttempts = 0;
const MAX_LOCK_ATTEMPTS = 10;

/**
 * Check if device is mobile
 */
function isMobileDevice(): boolean {
  return (
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
}

/**
 * Check if device is iOS
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Request fullscreen mode (required by some browsers for orientation lock)
 */
async function requestFullscreen(): Promise<boolean> {
  const doc = document.documentElement as any;
  
  if (doc.requestFullscreen) {
    try {
      await doc.requestFullscreen();
      return true;
    } catch (e) {
      return false;
    }
  } else if (doc.webkitRequestFullscreen) {
    try {
      await doc.webkitRequestFullscreen();
      return true;
    } catch (e) {
      return false;
    }
  } else if (doc.mozRequestFullScreen) {
    try {
      await doc.mozRequestFullScreen();
      return true;
    } catch (e) {
      return false;
    }
  } else if (doc.msRequestFullscreen) {
    try {
      await doc.msRequestFullscreen();
      return true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

/**
 * Lock screen orientation to portrait on mobile devices
 * Uses 'portrait-primary' for better compatibility
 */
export async function lockOrientationToPortrait(): Promise<void> {
  // Check if we're on a mobile device
  if (!isMobileDevice()) {
    return; // Don't lock on desktop
  }

  // iOS doesn't support programmatic orientation locking
  // The manifest.json orientation setting is the best we can do
  if (isIOS()) {
    console.log('[OrientationLock] iOS detected - using manifest orientation setting only');
    return;
  }

  // Prevent excessive lock attempts
  if (lockAttempts >= MAX_LOCK_ATTEMPTS) {
    return;
  }

  lockAttempts++;

  // Try to lock orientation using Screen Orientation API
  const orientation = screen.orientation as ScreenOrientationLock;
  
  if (orientation && typeof orientation.lock === 'function') {
    const lockFn = orientation.lock;
    
    // Try portrait-primary first (more specific, better support)
    try {
      await lockFn('portrait-primary');
      console.log('[OrientationLock] Successfully locked to portrait-primary');
      lockAttempts = 0; // Reset on success
      return;
    } catch (e) {
      // Fallback to portrait if portrait-primary fails
      try {
        await lockFn('portrait');
        console.log('[OrientationLock] Successfully locked to portrait');
        lockAttempts = 0; // Reset on success
        return;
      } catch (error: any) {
        // Lock may fail if API is not available on this device/browser
        // This is expected on iOS and some Android browsers
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('not available') || errorMsg.includes('not supported')) {
          // Silently handle "not available" errors - this is expected on many devices
          // We'll rely on manifest.json orientation setting and CSS fallback
          console.log('[OrientationLock] Orientation lock API not available - using manifest and CSS fallback');
        } else {
          console.warn('[OrientationLock] Could not lock orientation:', errorMsg);
        }
        
        // Some browsers require fullscreen mode for orientation lock
        // Try fullscreen as a last resort (only on user interaction)
        const isFullscreen = document.fullscreenElement || 
                             (document as any).webkitFullscreenElement ||
                             (document as any).mozFullScreenElement ||
                             (document as any).msFullscreenElement;
        
        if (!isFullscreen && lockAttempts <= 2) {
          // Only try fullscreen on first few attempts to avoid being too intrusive
          const fullscreenSuccess = await requestFullscreen();
          if (fullscreenSuccess) {
            console.log('[OrientationLock] Entered fullscreen mode, retrying lock...');
            // Retry lock after fullscreen
            try {
              await lockFn('portrait-primary');
              console.log('[OrientationLock] Successfully locked after fullscreen');
              lockAttempts = 0;
              return;
            } catch (e2) {
              try {
                await lockFn('portrait');
                console.log('[OrientationLock] Successfully locked to portrait after fullscreen');
                lockAttempts = 0;
                return;
              } catch (e3: any) {
                const e3Msg = e3?.message || String(e3);
                if (e3Msg.includes('not available') || e3Msg.includes('not supported')) {
                  console.log('[OrientationLock] Orientation lock not available on this device');
                } else {
                  console.warn('[OrientationLock] Still could not lock after fullscreen');
                }
              }
            }
          }
        }
      }
    }
  } 
  // Fallback for older browsers
  else if ((screen as any).lockOrientation) {
    try {
      const result = (screen as any).lockOrientation('portrait');
      if (result) {
        console.log('[OrientationLock] Successfully locked using lockOrientation');
        lockAttempts = 0;
      }
    } catch (e) {
      console.warn('[OrientationLock] lockOrientation failed:', e);
    }
  } 
  // Another fallback
  else if ((screen as any).mozLockOrientation) {
    try {
      const result = (screen as any).mozLockOrientation('portrait');
      if (result) {
        console.log('[OrientationLock] Successfully locked using mozLockOrientation');
        lockAttempts = 0;
      }
    } catch (e) {
      console.warn('[OrientationLock] mozLockOrientation failed:', e);
    }
  } 
  else if ((screen as any).msLockOrientation) {
    try {
      const result = (screen as any).msLockOrientation('portrait');
      if (result) {
        console.log('[OrientationLock] Successfully locked using msLockOrientation');
        lockAttempts = 0;
      }
    } catch (e) {
      console.warn('[OrientationLock] msLockOrientation failed:', e);
    }
  } else {
    // No orientation lock API available - this is expected on iOS and some browsers
    // The manifest.json orientation setting and CSS will handle it
    console.log('[OrientationLock] No orientation lock API available - using manifest and CSS fallback');
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
