import { Skeleton } from "./Skeleton";
import "../App.css";

export function TodoItemSkeleton() {
  return (
    <li className="todo-item skeleton-item">
      <div className="todo-item-content">
        <Skeleton
          width="24px"
          height="24px"
          borderRadius="4px"
          variant="rectangular"
          className="skeleton-checkbox"
        />
        <div className="todo-item-info">
          <Skeleton width="70%" height="1.125rem" className="skeleton-title" />
          <Skeleton width="50%" height="0.875rem" className="skeleton-line" />
        </div>
      </div>
      <button className="todo-remove" disabled>
        <Skeleton
          width="24px"
          height="24px"
          borderRadius="4px"
          variant="rectangular"
        />
      </button>
    </li>
  );
}

export function TodoSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TodoItemSkeleton key={index} />
      ))}
    </>
  );
}
