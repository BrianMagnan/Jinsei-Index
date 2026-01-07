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
  threshold = 130, // Balanced threshold - requires pull but not excessive
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const scrollTop = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;

    const target = e.currentTarget as HTMLElement;
    containerRef.current = target;
    touchStartY.current = e.touches[0].clientY;
    scrollTop.current = target.scrollTop;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled || isRefreshing || touchStartY.current === null) return;

    const target = e.currentTarget as HTMLElement;
    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;
    const currentScrollTop = target.scrollTop;

    // Only allow pull-to-refresh if:
    // 1. We're at or very close to the top (within 3px buffer for browser rounding)
    // 2. User is pulling down (distance > 0)
    // 3. We started at the top (scrollTop.current <= 3)
    // 4. The scroll position hasn't changed significantly (within 3px of start)
    // 5. User has pulled down enough (at least 50px) before activating
    const isAtTop = currentScrollTop <= 3;
    const startedAtTop = scrollTop.current <= 3;
    const scrollHasntChanged = Math.abs(currentScrollTop - scrollTop.current) <= 3;
    const isPullingDown = distance > 50; // Require at least 50px pull before activating

    if (isAtTop && startedAtTop && scrollHasntChanged && isPullingDown) {
      e.preventDefault(); // Prevent default scroll behavior
      const pullDist = Math.min(distance * 0.4, threshold * 1.5); // Balanced damping factor
      setPullDistance(pullDist);
      setIsPulling(true);
    } else if (currentScrollTop > 3 || !isPullingDown) {
      // Reset if user scrolls down or isn't pulling down
      setPullDistance(0);
      setIsPulling(false);
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = async () => {
    if (!enabled || !isPulling) {
      setPullDistance(0);
      setIsPulling(false);
      touchStartY.current = null;
      return;
    }

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Pull-to-refresh error:", error);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset
    setPullDistance(0);
    setIsPulling(false);
    touchStartY.current = null;
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

