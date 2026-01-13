import { useState, useCallback } from "react";
import { hapticFeedback } from "../utils/haptic";

/**
 * Hook for handling swipe-to-close gesture on modals (mobile).
 * Returns handlers and state for implementing swipe-down-to-close functionality.
 * 
 * @param onClose - Callback when swipe-to-close is triggered
 * @param minSwipeDistance - Minimum distance (px) to trigger close (default: 100)
 * @returns Object with handlers and state for modal swipe
 */
export function useModalSwipe(
  onClose: () => void,
  minSwipeDistance: number = 100
) {
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [swipeEnd, setSwipeEnd] = useState<{ x: number; y: number } | null>(
    null
  );
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setSwipeStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
      setSwipeEnd(null);
      setSwipeOffset(0);
    },
    []
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (swipeStart) {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      setSwipeEnd({ x: currentX, y: currentY });

      const deltaY = currentY - swipeStart.y;
      const deltaX = Math.abs(currentX - swipeStart.x);

      // Only allow vertical swipes down
      if (deltaY > 0 && deltaY > deltaX) {
        setSwipeOffset(deltaY);
      }
    }
  }, [swipeStart]);

  const handleTouchEnd = useCallback(() => {
    if (swipeStart && swipeEnd) {
      const deltaY = swipeEnd.y - swipeStart.y;
      if (deltaY > minSwipeDistance) {
        hapticFeedback.light();
        onClose();
      }
    }
    setSwipeStart(null);
    setSwipeEnd(null);
    setSwipeOffset(0);
  }, [swipeStart, swipeEnd, minSwipeDistance, onClose]);

  const reset = useCallback(() => {
    setSwipeStart(null);
    setSwipeEnd(null);
    setSwipeOffset(0);
  }, []);

  return {
    swipeOffset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    reset,
  };
}
