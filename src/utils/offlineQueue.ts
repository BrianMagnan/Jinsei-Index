// Offline queue system for API requests

interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
}

const QUEUE_STORAGE_KEY = 'offlineQueue';
const MAX_RETRIES = 3;
const MAX_QUEUE_SIZE = 100;

/**
 * Get the offline queue from localStorage
 */
export function getOfflineQueue(): QueuedRequest[] {
  try {
    const queueStr = localStorage.getItem(QUEUE_STORAGE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Save the offline queue to localStorage
 */
export function saveOfflineQueue(queue: QueuedRequest[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    // Failed to save offline queue
  }
}

/**
 * Add a request to the offline queue
 */
export function addToOfflineQueue(
  endpoint: string,
  method: string,
  body?: string,
  headers: Record<string, string> = {}
): string {
  const queue = getOfflineQueue();
  
  // Prevent queue from growing too large
  if (queue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest requests
    queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1);
  }

  const request: QueuedRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    endpoint,
    method,
    body,
    headers,
    timestamp: Date.now(),
    retries: 0,
  };

  queue.push(request);
  saveOfflineQueue(queue);
  
  return request.id;
}

/**
 * Remove a request from the offline queue
 */
export function removeFromOfflineQueue(requestId: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((req) => req.id !== requestId);
  saveOfflineQueue(filtered);
}

/**
 * Process the offline queue when back online
 */
export async function processOfflineQueue(
  baseURL: string,
  onSuccess?: (request: QueuedRequest) => void,
  onError?: (request: QueuedRequest, error: Error) => void
): Promise<{ success: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const request of queue) {
    try {
      const response = await fetch(`${baseURL}${request.endpoint}`, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      if (response.ok) {
        success++;
        if (onSuccess) {
          onSuccess(request);
        }
      } else {
        // Retry logic
        if (request.retries < MAX_RETRIES) {
          request.retries++;
          remaining.push(request);
        } else {
          failed++;
          if (onError) {
            onError(request, new Error(`HTTP ${response.status}`));
          }
        }
      }
    } catch (error) {
      // Retry logic
      if (request.retries < MAX_RETRIES) {
        request.retries++;
        remaining.push(request);
      } else {
        failed++;
        if (onError) {
          onError(request, error as Error);
        }
      }
    }
  }

  // Save remaining requests (those that need retries)
  saveOfflineQueue(remaining);

  return { success, failed };
}

/**
 * Clear the offline queue
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_STORAGE_KEY);
}

/**
 * Get queue size
 */
export function getQueueSize(): number {
  return getOfflineQueue().length;
}
