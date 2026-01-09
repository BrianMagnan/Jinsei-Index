import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { Spinner } from "./Spinner";
import "../App.css";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
}: PullToRefreshProps) {
  const { pullDistance, isPulling, isRefreshing, threshold, canRefresh } =
    usePullToRefresh({
      onRefresh,
      disabled,
    });

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = isPulling || isRefreshing;

  return (
    <div className="pull-to-refresh-container">
      {shouldShowIndicator && (
        <div
          className="pull-to-refresh-indicator"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 40)}px)`,
            opacity: Math.min(pullDistance / 40, 1),
          }}
        >
          <div className="pull-to-refresh-content">
            {isRefreshing ? (
              <>
                <Spinner size="sm" />
                <span>Refreshing...</span>
              </>
            ) : canRefresh ? (
              <>
                <div className="pull-to-refresh-icon release">↓</div>
                <span>Release to refresh</span>
              </>
            ) : (
              <>
                <div
                  className="pull-to-refresh-icon"
                  style={{
                    transform: `rotate(${pullProgress * 180}deg)`,
                  }}
                >
                  ↓
                </div>
                <span>Pull to refresh</span>
              </>
            )}
          </div>
        </div>
      )}
      <div
        className="pull-to-refresh-content-wrapper"
        style={{
          transform: isPulling
            ? `translateY(${Math.min(pullDistance, threshold)}px)`
            : "translateY(0)",
          transition: isPulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
