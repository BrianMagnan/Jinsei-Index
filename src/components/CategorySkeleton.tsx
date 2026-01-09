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
      <button className="edit-button" disabled>
        <Skeleton
          width="28px"
          height="28px"
          borderRadius="4px"
          variant="rectangular"
        />
      </button>
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
