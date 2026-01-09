import { useState, useEffect } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // Track if we just came back online
}

/**
 * Hook to detect network connectivity status
 * Listens to online/offline events and provides current status
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    // Initialize with current navigator state
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    return {
      isOnline,
      wasOffline: false,
    };
  });

  useEffect(() => {
    // Handle online event
    const handleOnline = () => {
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: !prev.isOnline, // Set to true if we were offline
      }));
    };

    // Handle offline event
    const handleOffline = () => {
      setStatus({
        isOnline: false,
        wasOffline: false,
      });
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}
