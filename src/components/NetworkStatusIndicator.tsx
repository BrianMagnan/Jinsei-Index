import { useEffect, useRef } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useToast } from "../contexts/ToastContext";
import { syncOfflineQueue } from "../services/api";
import { getQueueSize } from "../utils/offlineQueue";

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
        const queueSize = getQueueSize();
        const message = queueSize > 0
          ? `You're offline. ${queueSize} request${queueSize === 1 ? '' : 's'} queued.`
          : "You're offline. Some features may be unavailable.";
        toast.showError(message);
      } else {
        // Sync offline queue when back online
        syncOfflineQueue()
          .then(({ success, failed }) => {
            if (success > 0 || failed > 0) {
              toast.showSuccess(
                `Connection restored. ${success} request${success === 1 ? '' : 's'} synced.${failed > 0 ? ` ${failed} failed.` : ''}`
              );
            } else {
              toast.showSuccess("Connection restored.");
            }
          })
          .catch((error) => {
            console.error('Error syncing offline queue:', error);
            toast.showSuccess("Connection restored.");
          });
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
