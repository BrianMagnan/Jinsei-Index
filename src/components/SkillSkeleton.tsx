import { Skeleton } from "./Skeleton";
import "../App.css";

export function SkillSkeleton() {
  return (
    <li className="skill-item skeleton-item">
      <div className="skill-info">
        <Skeleton width="70%" height="1.25rem" className="skeleton-title" />
        <div className="skill-stats">
          <Skeleton width="60px" height="0.875rem" />
          <Skeleton width="60px" height="0.875rem" />
        </div>
      </div>
      <div className="skill-actions">
        <Skeleton
          width="28px"
          height="28px"
          borderRadius="4px"
          variant="rectangular"
        />
      </div>
    </li>
  );
}

export function SkillSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkillSkeleton key={index} />
      ))}
    </>
  );
}
