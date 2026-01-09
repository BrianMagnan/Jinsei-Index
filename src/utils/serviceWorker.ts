// Service Worker registration and management

const SW_PATH = '/sw.js';

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Service Worker] Not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    console.log('[Service Worker] Registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[Service Worker] New version available');
            // You can show a notification to the user here
          }
        });
      }
    });

    // Handle service worker updates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[Service Worker] New version activated, reloading...');
        window.location.reload();
      }
    });

    return registration;
  } catch (error) {
    console.error('[Service Worker] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker (for development/testing)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('[Service Worker] Unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('[Service Worker] Unregistration failed:', error);
    return false;
  }
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}
