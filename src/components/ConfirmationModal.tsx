import { useState, useEffect, useRef } from "react";
import { hapticFeedback } from "../utils/haptic";
import "../App.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmationModalProps) {
  const [modalSwipeStart, setModalSwipeStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [modalSwipeEnd, setModalSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [modalSwipeOffset, setModalSwipeOffset] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open on mobile
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, loading, onClose]);

  // Swipe gesture handlers for closing modal
  const minSwipeDistance = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    if (loading) return;
    setModalSwipeEnd(null);
    setModalSwipeStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (loading || !modalSwipeStart) return;
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    setModalSwipeEnd(currentTouch);

    const distanceY = modalSwipeStart.y - currentTouch.y;
    const distanceX = modalSwipeStart.x - currentTouch.x;
    const isDownSwipe = distanceY < 0;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (isVerticalSwipe && isDownSwipe) {
      const offset = Math.min(Math.abs(distanceY), 200);
      setModalSwipeOffset(offset);
    }
  };

  const onTouchEnd = () => {
    if (loading || !modalSwipeStart || !modalSwipeEnd) {
      setModalSwipeStart(null);
      setModalSwipeEnd(null);
      setModalSwipeOffset(0);
      return;
    }

    const distanceY = modalSwipeStart.y - modalSwipeEnd.y;
    const distanceX = modalSwipeStart.x - modalSwipeEnd.x;
    const isDownSwipe = distanceY < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (isVerticalSwipe && isDownSwipe) {
      hapticFeedback.light();
      onClose();
    }

    setModalSwipeStart(null);
    setModalSwipeEnd(null);
    setModalSwipeOffset(0);
  };

  const handleConfirm = () => {
    if (loading) return;
    hapticFeedback.medium();
    onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    hapticFeedback.light();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="confirmation-modal-overlay"
        onClick={loading ? undefined : handleCancel}
      />
      <div
        ref={modalRef}
        className={`confirmation-modal ${variant === "danger" ? "danger" : variant === "warning" ? "warning" : ""}`}
        style={{
          transform: modalSwipeOffset > 0 ? `translateY(${modalSwipeOffset}px)` : undefined,
          opacity: modalSwipeOffset > 0 ? 1 - modalSwipeOffset / 200 : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="confirmation-modal-header">
          <h3 className="confirmation-modal-title">{title}</h3>
          {!loading && (
            <button
              className="confirmation-modal-close"
              onClick={handleCancel}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        <div className="confirmation-modal-content">
          <p className="confirmation-modal-message">{message}</p>
        </div>
        <div className="confirmation-modal-actions">
          <button
            className="confirmation-modal-button cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-modal-button confirm ${variant}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </>
  );
}
