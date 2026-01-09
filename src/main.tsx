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
// We'll try on load, and also on first user interaction
if (typeof window !== 'undefined') {
  // Try immediately (may fail without user gesture)
  lockOrientationToPortrait();
  
  // Also try on first user interaction
  const lockOnInteraction = () => {
    lockOrientationToPortrait();
    document.removeEventListener('touchstart', lockOnInteraction);
    document.removeEventListener('click', lockOnInteraction);
  };
  
  document.addEventListener('touchstart', lockOnInteraction, { once: true });
  document.addEventListener('click', lockOnInteraction, { once: true });
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
