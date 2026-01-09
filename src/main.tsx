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
  
  // Try on first user interaction (required by some browsers)
  const lockOnInteraction = () => {
    lockOrientationToPortrait();
  };
  
  // Try on multiple interaction types
  document.addEventListener('touchstart', lockOnInteraction, { once: true, passive: true });
  document.addEventListener('click', lockOnInteraction, { once: true });
  document.addEventListener('mousedown', lockOnInteraction, { once: true });
  
  // Re-lock on orientation change (in case it gets unlocked)
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure orientation change is complete
    setTimeout(() => {
      lockOrientationToPortrait();
    }, 100);
  });
  
  // Also listen to screen orientation API changes
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      setTimeout(() => {
        lockOrientationToPortrait();
      }, 100);
    });
  }
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
