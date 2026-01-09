import { useEffect, useState } from "react";

/**
 * Component that shows a message when device is in landscape mode on mobile
 * Encourages users to rotate to portrait for better experience
 */
export function LandscapeLock() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Use a small delay to ensure dimensions are updated after orientation change
      setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // More aggressive mobile detection
        const isMobileDevice = 
          width <= 768 || 
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
          ('ontouchstart' in window) ||
          (navigator.maxTouchPoints > 0);
        // Landscape detection - width must be greater than height
        const isLandscapeMode = width > height;
        
        setIsMobile(isMobileDevice);
        setIsLandscape(isLandscapeMode);
        
        // Debug logging
        if (isMobileDevice) {
          console.log('[LandscapeLock] Check:', { 
            width, 
            height, 
            isMobile: isMobileDevice, 
            isLandscape: isLandscapeMode,
            ratio: (width / height).toFixed(2)
          });
        }
      }, 200);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    // Also use screen.orientation API if available
    if (screen.orientation) {
      screen.orientation.addEventListener("change", checkOrientation);
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", checkOrientation);
      }
    };
  }, []);

  // Only show on mobile devices in landscape
  if (!isMobile || !isLandscape) {
    return null;
  }

  return (
    <div className="landscape-lock">
      <div className="landscape-lock-content">
        <div className="landscape-lock-icon">📱</div>
        <h2 className="landscape-lock-title">Please Rotate Your Device</h2>
        <p className="landscape-lock-message">
          This app is optimized for portrait mode. Please rotate your device to
          continue.
        </p>
      </div>
    </div>
  );
}
