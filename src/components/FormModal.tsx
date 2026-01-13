import type { ReactNode } from "react";
import { hapticFeedback } from "../utils/haptic";
import { useModalSwipe } from "../hooks/useModalSwipe";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  loading?: boolean;
}

/**
 * Unified form modal component for add/edit forms.
 * Handles swipe-to-close on mobile and provides consistent structure.
 */
export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  loading = false,
}: FormModalProps) {
  const { swipeOffset, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useModalSwipe(onClose);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    hapticFeedback.light();
    onClose();
  };

  const handleCloseClick = () => {
    hapticFeedback.light();
    onClose();
  };

  return (
    <div
      className="challenge-edit-modal-overlay"
      onClick={handleOverlayClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="challenge-edit-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform:
            swipeOffset > 0
              ? `translateY(${Math.min(swipeOffset, 200)}px)`
              : undefined,
          transition: swipeOffset > 0 ? "none" : "transform 0.2s ease-out",
        }}
      >
        <div className="challenge-action-modal-header">
          <h3>{title}</h3>
          <button
            className="challenge-action-modal-close"
            onClick={handleCloseClick}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
