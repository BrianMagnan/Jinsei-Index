import { Skeleton } from "./Skeleton";
import "../App.css";

export function SkillSkeleton() {
  return (
    <li className="skill-item skeleton-item">
      <div className="skill-content">
        <div className="skill-header">
          <div className="skill-name">
            <Skeleton width="70%" height="1.25rem" />
          </div>
        </div>
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
