import { useEffect, useRef } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useToast } from "../contexts/ToastContext";

/**
 * Network status indicator component
 * Shows a visual indicator and toast notifications for connection changes
 */
export function NetworkStatusIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const toast = useToast();
  const lastStatusRef = useRef<boolean | null>(null);

  // Show toast notifications when connection status changes
  useEffect(() => {
    // Only show toast on actual status change, not on every render
    if (lastStatusRef.current === null) {
      // Initial render - don't show toast
      lastStatusRef.current = isOnline;
      return;
    }

    if (lastStatusRef.current !== isOnline) {
      if (!isOnline) {
        toast.showError("You're offline. Some features may be unavailable.");
      } else {
        toast.showSuccess("Connection restored. Syncing data...");
      }
      lastStatusRef.current = isOnline;
    }
  }, [isOnline, wasOffline, toast]);

  // Don't render anything if online (clean UI)
  if (isOnline) {
    return null;
  }

  return (
    <div className="network-status-indicator offline">
      <span className="network-status-icon">📡</span>
      <span className="network-status-text">Offline</span>
    </div>
  );
}
