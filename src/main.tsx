import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerServiceWorker } from "./utils/serviceWorker";
import { lockOrientationToPortrait } from "./utils/orientationLock";

// Register service worker
if (import.meta.env.PROD) {
  registerServiceWorker().catch((error) => {
    console.error("Service Worker registration failed:", error);
  });
}

// Lock orientation to portrait on mobile devices
// Note: Some browsers require user interaction before locking
if (typeof window !== 'undefined') {
  // Try immediately (may fail without user gesture)
  lockOrientationToPortrait();
  
  // Try on user interaction (required by some browsers)
  // Use a more aggressive approach - try on every interaction for a short period
  let interactionCount = 0;
  const MAX_INTERACTIONS = 5;
  
  const lockOnInteraction = async () => {
    if (interactionCount < MAX_INTERACTIONS) {
      await lockOrientationToPortrait();
      interactionCount++;
    }
  };
  
  // Try on multiple interaction types (not just once)
  document.addEventListener('touchstart', lockOnInteraction, { passive: true });
  document.addEventListener('click', lockOnInteraction);
  document.addEventListener('mousedown', lockOnInteraction);
  
  // Re-lock on orientation change (in case it gets unlocked)
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure orientation change is complete
    setTimeout(async () => {
      await lockOrientationToPortrait();
    }, 100);
  });
  
  // Also listen to screen orientation API changes
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      setTimeout(async () => {
        await lockOrientationToPortrait();
      }, 100);
    });
  }
  
  // Try locking when app becomes visible (e.g., switching back to app)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setTimeout(async () => {
        await lockOrientationToPortrait();
      }, 100);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
