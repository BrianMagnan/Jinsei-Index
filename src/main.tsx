import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerServiceWorker } from "./utils/serviceWorker";
import { initializeNotifications } from "./utils/notifications";

// Register service worker
if (import.meta.env.PROD) {
  registerServiceWorker()
    .then(() => {
      // Initialize notifications after service worker is ready
      initializeNotifications();
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
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
