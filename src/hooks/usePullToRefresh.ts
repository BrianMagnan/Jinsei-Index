import { useState, useRef } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  enabled?: boolean; // Whether pull-to-refresh is enabled
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    style?: React.CSSProperties;
  };
}

export function usePullToRefresh({
  onRefresh,
  threshold = 100,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const initialScrollTop = useRef<number>(0);
  const actualDistance = useRef<number>(0);

  const reset = () => {
    setPullDistance(0);
    setIsPulling(false);
    touchStartY.current = null;
    actualDistance.current = 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;

    const target = e.currentTarget as HTMLElement;
    touchStartY.current = e.touches[0].clientY;
    initialScrollTop.current = target.scrollTop;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled || isRefreshing || touchStartY.current === null) return;

    const target = e.currentTarget as HTMLElement;
    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;
    const scrollTop = target.scrollTop;

    // Only allow pull-to-refresh if at top and pulling down
    const isAtTop = scrollTop <= 5 && initialScrollTop.current <= 5;
    const isPullingDown = distance > 30;

    if (isAtTop && isPullingDown) {
      e.preventDefault();
      actualDistance.current = distance;
      // Damped distance for visual feedback (feels smoother)
      const visualDistance = Math.min(distance * 0.5, threshold * 2);
      setPullDistance(visualDistance);
      setIsPulling(true);
    } else {
      reset();
    }
  };

  const handleTouchEnd = async () => {
    if (!enabled || !isPulling) {
      reset();
      return;
    }

    // Use actual distance (not damped) for threshold check
    if (actualDistance.current >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Pull-to-refresh error:", error);
      } finally {
        setIsRefreshing(false);
      }
    }

    reset();
  };

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    containerProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: {
        transform: isPulling ? `translateY(${pullDistance}px)` : undefined,
        transition: isPulling ? "none" : "transform 0.3s ease-out",
      },
    },
  };
}

