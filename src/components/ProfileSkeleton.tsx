import { Skeleton } from "./Skeleton";
import "../App.css";

export function ProfileSkeleton() {
  return (
    <div className="profiles-container">
      <div className="profiles-header">
        <Skeleton width="150px" height="2rem" className="skeleton-title" />
        <Skeleton
          width="32px"
          height="32px"
          borderRadius="4px"
          variant="rectangular"
        />
      </div>

      <div className="profile-card skeleton-detail">
        <div className="profile-avatar">
          <Skeleton
            width="120px"
            height="120px"
            borderRadius="50%"
            variant="circular"
          />
        </div>
        <div className="profile-info">
          <Skeleton width="200px" height="1.75rem" className="skeleton-title" />
          <Skeleton width="180px" height="1rem" className="skeleton-line" />
          <Skeleton width="150px" height="1rem" className="skeleton-line" />
          <div className="profile-stats">
            <div className="stat">
              <Skeleton width="60px" height="0.875rem" />
              <Skeleton width="40px" height="1.25rem" />
            </div>
            <div className="stat">
              <Skeleton width="30px" height="0.875rem" />
              <Skeleton width="40px" height="1.25rem" />
            </div>
          </div>
        </div>
      </div>

      <div className="profile-detail">
        <Skeleton width="120px" height="1.5rem" className="skeleton-title" />
        <div className="profile-detail-content">
          <Skeleton width="100%" height="1rem" className="skeleton-line" />
          <Skeleton width="100%" height="1rem" className="skeleton-line" />
          <Skeleton width="90%" height="1rem" className="skeleton-line" />
          <Skeleton width="100%" height="1rem" className="skeleton-line" />
          <Skeleton width="85%" height="1rem" className="skeleton-line" />
        </div>
      </div>
    </div>
  );
}
