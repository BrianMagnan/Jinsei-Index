import { Skeleton } from "./Skeleton";
import "../App.css";

export function CategorySkeleton() {
  return (
    <li className="categories-list-item skeleton-item">
      <div className="category-info">
        <Skeleton width="60%" height="1.5rem" className="skeleton-title" />
        <div className="category-stats">
          <Skeleton width="50px" height="1rem" />
          <Skeleton width="50px" height="1rem" />
        </div>
      </div>
      <div className="category-actions">
        <Skeleton
          width="32px"
          height="32px"
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
    </li>
  );
}

export function CategorySkeletonList({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <CategorySkeleton key={index} />
      ))}
    </>
  );
}
