import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { hapticFeedback } from "../utils/haptic";
import "../App.css";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

interface ToastProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss
    const duration = toast.duration ?? (toast.type === "error" ? 5000 : 3000);
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleClose = () => {
    setIsExiting(true);
    hapticFeedback.light();
    setTimeout(() => {
      onClose();
    }, 300); // Match exit animation duration
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "info":
        return "ℹ";
      default:
        return "";
    }
  };

  return (
    <div
      className={`toast ${toast.type} ${
        isVisible && !isExiting ? "visible" : ""
      } ${isExiting ? "exiting" : ""}`}
      role="alert"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div className="toast-content">
        <span className="toast-icon">{getIcon()}</span>
        <span className="toast-message">{toast.message}</span>
      </div>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
}
