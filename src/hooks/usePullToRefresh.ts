import { useState, useRef, useEffect, useCallback } from "react";
import { hapticFeedback } from "../utils/haptic";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

const DEFAULT_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;
const RESISTANCE_FACTOR = 0.5; // How much resistance after threshold

export function usePullToRefresh({
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  const touchStartY = useRef<number | null>(null);
  const scrollTop = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleRefresh = useCallback(async () => {
    if (state.isRefreshing || disabled) return;

    setState((prev) => ({ ...prev, isRefreshing: true, pullDistance: 0 }));
    hapticFeedback.medium();

    try {
      await onRefresh();
      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.error();
      console.error("Pull-to-refresh error:", error);
    } finally {
      setState((prev) => ({ ...prev, isRefreshing: false, isPulling: false }));
    }
  }, [onRefresh, state.isRefreshing, disabled]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || state.isRefreshing) return;

      const target = e.target as HTMLElement;
      const container = target.closest(".pull-to-refresh-container") as HTMLElement;
      
      if (!container) return;

      // Find the scrollable element (the content wrapper)
      const scrollableElement = container.querySelector(".pull-to-refresh-content-wrapper") as HTMLElement;
      if (!scrollableElement) return;
      
      containerRef.current = scrollableElement;
      const currentScrollTop = scrollableElement.scrollTop;

      // Only start if at the top of the scrollable area (with small threshold for touch precision)
      if (currentScrollTop <= 5) {
        touchStartY.current = e.touches[0].clientY;
        scrollTop.current = currentScrollTop;
        setState((prev) => ({ ...prev, isPulling: true }));
      }
    },
    [disabled, state.isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (
        disabled ||
        !state.isPulling ||
        touchStartY.current === null ||
        state.isRefreshing ||
        !containerRef.current
      )
        return;

      // Continuously check if we're still at the top
      const currentScrollTop = containerRef.current.scrollTop;
      const previousScrollTop = scrollTop.current;
      
      // If user has scrolled down (scrollTop increased), cancel the pull
      if (currentScrollTop > 5) {
        setState((prev) => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
        }));
        touchStartY.current = null;
        return;
      }

      // If scroll position decreased (scrolling up), cancel immediately
      if (currentScrollTop < previousScrollTop) {
        setState((prev) => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
        }));
        touchStartY.current = null;
        scrollTop.current = currentScrollTop;
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;

      // Only allow downward pull when at the top and user is actually pulling down
      // Require minimum pull distance to avoid accidental triggers
      if (deltaY > 10 && currentScrollTop <= 0) {
        e.preventDefault(); // Prevent default scroll behavior

        let pullDistance = deltaY;

        // Apply resistance after threshold
        if (pullDistance > threshold) {
          const excess = pullDistance - threshold;
          pullDistance = threshold + excess * RESISTANCE_FACTOR;
        }

        // Cap at max distance
        pullDistance = Math.min(pullDistance, MAX_PULL_DISTANCE);

        setState((prev) => {
          // Haptic feedback when threshold is reached
          if (pullDistance >= threshold && prev.pullDistance < threshold) {
            hapticFeedback.light();
          }
          return { ...prev, pullDistance };
        });
        // Update scroll position reference
        scrollTop.current = currentScrollTop;
        return;
      } else if (deltaY <= 0 || currentScrollTop > 0) {
        // User is scrolling up, not pulling down, or has scrolled - cancel immediately
        setState((prev) => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
        }));
        touchStartY.current = null;
        scrollTop.current = currentScrollTop;
      }
    },
    [disabled, state.isPulling, state.isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled || !state.isPulling) return;

    if (state.pullDistance >= threshold && !state.isRefreshing) {
      handleRefresh();
    } else {
      // Reset if not enough pull
      setState((prev) => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
      }));
    }

    touchStartY.current = null;
  }, [disabled, state.isPulling, state.pullDistance, state.isRefreshing, threshold, handleRefresh]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance: state.pullDistance,
    isPulling: state.isPulling,
    isRefreshing: state.isRefreshing,
    threshold,
    canRefresh: state.pullDistance >= threshold,
  };
}
