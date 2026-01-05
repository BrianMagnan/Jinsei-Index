import { hapticFeedback } from "../utils/haptic";
import "../App.css";

interface BottomNavProps {
  viewMode: "main" | "profiles" | "todo" | "daily";
  onViewModeChange: (mode: "main" | "profiles" | "todo" | "daily") => void;
  onSearchClick: () => void;
  onHomeClick?: () => void;
}

export function BottomNav({
  viewMode,
  onViewModeChange,
  onSearchClick,
  onHomeClick,
}: BottomNavProps) {
  const handleHomeClick = () => {
    hapticFeedback.navigation();
    if (onHomeClick) {
      onHomeClick();
    } else {
      // Fallback to default behavior
      onViewModeChange("main");
    }
  };

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      <button
        className={`bottom-nav-item ${viewMode === "main" ? "active" : ""}`}
        onClick={handleHomeClick}
        aria-label="Home"
      >
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">Home</span>
      </button>
      <button
        className="bottom-nav-item"
        onClick={() => {
          hapticFeedback.navigation();
          onSearchClick();
        }}
        aria-label="Search"
      >
        <span className="bottom-nav-icon">🔍</span>
        <span className="bottom-nav-label">Search</span>
      </button>
      <button
        className={`bottom-nav-item ${viewMode === "todo" ? "active" : ""}`}
        onClick={() => {
          hapticFeedback.navigation();
          onViewModeChange("todo");
        }}
        aria-label="To-Do List"
      >
        <span className="bottom-nav-icon">📝</span>
        <span className="bottom-nav-label">To-Do</span>
      </button>
      <button
        className={`bottom-nav-item ${viewMode === "daily" ? "active" : ""}`}
        onClick={() => {
          hapticFeedback.navigation();
          onViewModeChange("daily");
        }}
        aria-label="Daily List"
      >
        <span className="bottom-nav-icon">📅</span>
        <span className="bottom-nav-label">Daily</span>
      </button>
      <button
        className={`bottom-nav-item ${viewMode === "profiles" ? "active" : ""}`}
        onClick={() => {
          hapticFeedback.navigation();
          onViewModeChange("profiles");
        }}
        aria-label="Profile"
      >
        <span className="bottom-nav-icon">👤</span>
        <span className="bottom-nav-label">Profile</span>
      </button>
    </nav>
  );
}
