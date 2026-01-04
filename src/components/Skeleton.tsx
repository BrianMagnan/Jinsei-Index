import "../App.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "4px",
  className = "",
  variant = "rectangular",
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius:
      variant === "circular"
        ? "50%"
        : variant === "text"
        ? "4px"
        : borderRadius,
  };

  return (
    <div
      className={`skeleton ${className}`}
      style={style}
      aria-label="Loading..."
      aria-busy="true"
    />
  );
}
