import { useEffect, useState } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";
import { XPBar } from "./XPBar";

export function CharacterDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate total XP and average level
  const totalXP = categories.reduce((sum, cat) => sum + cat.xp, 0);
  const totalLevels = categories.reduce((sum, cat) => sum + cat.level, 0);
  const averageLevel =
    categories.length > 0 ? Math.round(totalLevels / categories.length) : 1;

  if (loading) {
    return <div className="dashboard-loading">Loading character data...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  return (
    <div className="character-dashboard">
      <div className="dashboard-header">
        <h1>Character Dashboard</h1>
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category._id} className="category-card">
            <h2>{category.name}</h2>
            {category.description && (
              <p className="category-description">{category.description}</p>
            )}
            <div className="category-stats">
              <span className="category-level">Level {category.level}</span>
              <span className="category-xp">
                {category.xp.toLocaleString()} XP
              </span>
            </div>
            <XPBar
              currentXP={category.xp}
              level={category.level}
              xpPerLevel={200}
              showLabels={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
