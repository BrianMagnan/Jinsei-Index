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
      const isMobileDevice = window.innerWidth <= 768;
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      
      setIsMobile(isMobileDevice);
      setIsLandscape(isLandscapeMode);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
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
