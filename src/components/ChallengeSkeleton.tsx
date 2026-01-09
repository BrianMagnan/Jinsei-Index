import { Skeleton } from "./Skeleton";
import "../App.css";

export function ChallengeSkeleton() {
  return (
    <li className="challenge-item skeleton-item">
      <div className="challenge-info">
        <div className="challenge-name">
          <Skeleton width="75%" height="1.125rem" />
        </div>
      </div>
    </li>
  );
}

export function ChallengeSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ChallengeSkeleton key={index} />
      ))}
    </>
  );
}

export function ChallengeDetailSkeleton() {
  return (
    <div className="challenge-detail skeleton-detail">
      <div className="challenge-detail-header">
        <Skeleton
          width="40px"
          height="40px"
          borderRadius="4px"
          variant="rectangular"
        />
        <Skeleton width="60%" height="2rem" className="skeleton-title" />
        <Skeleton
          width="40px"
          height="40px"
          borderRadius="4px"
          variant="rectangular"
        />
        <Skeleton
          width="32px"
          height="32px"
          borderRadius="4px"
          variant="rectangular"
        />
      </div>
      <div className="challenge-detail-description-container">
        <div className="challenge-detail-description-readonly">
          <Skeleton width="100%" height="1rem" className="skeleton-line" />
          <Skeleton width="100%" height="1rem" className="skeleton-line" />
          <Skeleton width="90%" height="1rem" className="skeleton-line" />
          <Skeleton width="100%" height="1rem" className="skeleton-line" />
          <Skeleton width="85%" height="1rem" className="skeleton-line" />
        </div>
      </div>
      <div className="challenge-detail-xp">
        <Skeleton width="80px" height="1.5rem" />
      </div>
      <div className="challenge-detail-actions">
        <div className="challenge-detail-action-buttons">
          <Skeleton width="100%" height="48px" borderRadius="8px" />
          <Skeleton width="100%" height="48px" borderRadius="8px" />
          <Skeleton width="100%" height="48px" borderRadius="8px" />
        </div>
      </div>
    </div>
  );
}
