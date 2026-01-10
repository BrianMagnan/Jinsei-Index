import { Skeleton } from "./Skeleton";
import "../App.css";

export function CategorySkeleton() {
  return (
    <li className="category-item skeleton-item">
      <div className="categories-list-item-content">
        <span className="category-name">
          <Skeleton width="60%" height="1.5rem" />
        </span>
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
