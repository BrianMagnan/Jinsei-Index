import { useState, useEffect, useCallback } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";

type ViewType =
  | "dashboard"
  | "skilltree"
  | "management"
  | "category"
  | "skill"
  | "subskill";

interface SidebarProps {
  activeView: ViewType;
  selectedCategoryId: string | null;
  onViewChange: (view: ViewType) => void;
  onCategoryClick: (categoryId: string) => void;
}

export function Sidebar({
  activeView,
  selectedCategoryId,
  onViewChange,
  onCategoryClick,
}: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
    null
  );
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(
    null
  );

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const data = await categoryAPI.getAll();

      // Apply saved order from localStorage
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const orderedCategories = orderArray
            .map((id) => data.find((cat: Category) => cat._id === id))
            .filter((cat): cat is Category => cat !== undefined);

          // Add any new categories that aren't in the saved order
          const existingIds = new Set(orderArray);
          const newCategories = data.filter(
            (cat: Category) => !existingIds.has(cat._id)
          );

          setCategories([...orderedCategories, ...newCategories]);
        } catch {
          // If parsing fails, use default order
          setCategories(data);
        }
      } else {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Reload categories when switching views (except management)
  useEffect(() => {
    if (activeView !== "management") {
      loadCategories();
    }
  }, [activeView, loadCategories]);

  // Clean up order when categories are deleted
  useEffect(() => {
    const savedOrder = localStorage.getItem("categoryOrder");
    if (savedOrder) {
      try {
        const orderArray: string[] = JSON.parse(savedOrder);
        const currentIds = new Set(categories.map((cat) => cat._id));
        const validOrder = orderArray.filter((id) => currentIds.has(id));

        if (validOrder.length !== orderArray.length) {
          localStorage.setItem("categoryOrder", JSON.stringify(validOrder));
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [categories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setCreatingCategory(true);
      await categoryAPI.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowCategoryForm(false);
      await loadCategories();
    } catch (err) {
      console.error("Failed to create category:", err);
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const saveCategoryOrder = (orderedCategories: Category[]) => {
    const orderArray = orderedCategories.map((cat) => cat._id);
    localStorage.setItem("categoryOrder", JSON.stringify(orderArray));
  };

  const handleDragStart = (categoryId: string) => {
    setDraggedCategoryId(categoryId);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (draggedCategoryId && draggedCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategoryId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverCategoryId(null);

    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      setDraggedCategoryId(null);
      return;
    }

    const draggedIndex = categories.findIndex(
      (cat) => cat._id === draggedCategoryId
    );
    const targetIndex = categories.findIndex(
      (cat) => cat._id === targetCategoryId
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCategoryId(null);
      return;
    }

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    setCategories(newCategories);
    saveCategoryOrder(newCategories);
    setDraggedCategoryId(null);
  };

  const handleDragEnd = () => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick(categoryId);
    onViewChange("category");
  };

  return (
    <nav className="app-nav">
      <div className="nav-buttons">
        <button
          className={activeView === "dashboard" ? "active" : ""}
          onClick={() => onViewChange("dashboard")}
        >
          Dashboard
        </button>
      </div>

      <div className="sidebar-categories">
        <div className="sidebar-categories-header">
          <h2 className="sidebar-categories-title">Categories</h2>
          <button
            className="sidebar-add-button"
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            title="Add new category"
          >
            +
          </button>
        </div>

        {showCategoryForm && (
          <form
            className="sidebar-category-form"
            onSubmit={handleCreateCategory}
          >
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              autoFocus
              className="sidebar-form-input"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              className="sidebar-form-input"
            />
            <div className="sidebar-form-actions">
              <button
                type="submit"
                className="sidebar-form-submit"
                disabled={creatingCategory}
              >
                {creatingCategory ? "Creating..." : "Add"}
              </button>
              <button
                type="button"
                className="sidebar-form-cancel"
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName("");
                  setNewCategoryDescription("");
                }}
                disabled={creatingCategory}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loadingCategories ? (
          <div className="sidebar-loading">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="sidebar-empty">No categories yet</div>
        ) : (
          <div className="category-list">
            {categories.map((category) => (
              <div
                key={category._id}
                draggable
                onDragStart={() => handleDragStart(category._id)}
                onDragOver={(e) => handleDragOver(e, category._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category._id)}
                onDragEnd={handleDragEnd}
                className={`category-item-wrapper ${
                  draggedCategoryId === category._id ? "dragging" : ""
                } ${dragOverCategoryId === category._id ? "drag-over" : ""}`}
              >
                <button
                  className={`category-item ${
                    activeView === "category" &&
                    selectedCategoryId === category._id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleCategoryClick(category._id)}
                >
                  <div className="category-item-drag-handle">☰</div>
                  <div className="category-item-content">
                    <div className="category-item-name">{category.name}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
