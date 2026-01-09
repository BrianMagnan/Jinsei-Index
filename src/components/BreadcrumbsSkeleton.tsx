import { Skeleton } from "./Skeleton";
import "../App.css";

export function BreadcrumbsSkeleton() {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        <li className="breadcrumb-item">
          <Skeleton width="80px" height="1rem" />
        </li>
        <li className="breadcrumb-separator" aria-hidden="true">
          ›
        </li>
        <li className="breadcrumb-item">
          <Skeleton width="100px" height="1rem" />
        </li>
      </ol>
    </nav>
  );
}
