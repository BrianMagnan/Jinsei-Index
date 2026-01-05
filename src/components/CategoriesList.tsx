import { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";
import { Spinner } from "./Spinner";
import { CategorySkeletonList } from "./CategorySkeleton";
import { EmptyState } from "./EmptyState";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { Breadcrumbs } from "./Breadcrumbs";
import "../App.css";

interface CategoriesListProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategoriesList({
  selectedCategoryId,
  onCategorySelect,
}: CategoriesListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();

      // Apply saved order from localStorage
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const orderedCategories = orderArray
            .map((id) => data.find((cat: Category) => cat._id === id))
            .filter((cat): cat is Category => cat !== undefined);

          const existingIds = new Set(orderArray);
          const newCategories = data.filter(
            (cat: Category) => !existingIds.has(cat._id)
          );

          newCategories.sort((a: Category, b: Category) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });

          setCategories([...orderedCategories, ...newCategories]);
        } catch {
          setCategories(data);
        }
      } else {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || creatingCategory) return;

    setCreatingCategory(true);
    try {
      const newCategory = await categoryAPI.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddForm(false);

      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          orderArray.push(newCategory._id);
          localStorage.setItem("categoryOrder", JSON.stringify(orderArray));
        } catch {
          // If parsing fails, just reload
        }
      } else {
        localStorage.setItem(
          "categoryOrder",
          JSON.stringify([newCategory._id])
        );
      }

      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async (
    categoryId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();
    if (updatingCategory === categoryId) return;

    setUpdatingCategory(categoryId);
    try {
      await categoryAPI.update(categoryId, {
        name: editCategoryName.trim(),
      });
      setEditingCategoryId(null);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setUpdatingCategory(null);
    }
  };

  const { pullDistance, isPulling, containerProps } = usePullToRefresh({
    onRefresh: loadCategories,
    enabled: !loading && !creatingCategory,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  if (loading) {
    return (
      <div className="categories-list">
        <div className="section-header">
          <div className="header-title-section">
            <h2>Categories</h2>
          </div>
        </div>
        <div className="categories-list-content">
          <ul className="categories-list-grid">
            <CategorySkeletonList count={6} />
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      className="categories-list"
      {...containerProps}
      style={{ ...containerProps.style, position: "relative" }}
    >
      {isPulling && (
        <div
          className="pull-to-refresh-indicator"
          style={{
            position: "absolute",
            top: Math.max(0, pullDistance - 40),
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
          }}
        >
          {pullDistance >= 80 ? (
            <Spinner size="sm" />
          ) : (
            <span style={{ fontSize: "24px" }}>↓</span>
          )}
        </div>
      )}
      <Breadcrumbs category={null} skill={null} onCategoriesClick={undefined} />
      <div className="section-header">
        <h2>Categories</h2>
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={handleCreateCategory}>
          <input
            type="text"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
            autoFocus
          />
          <div className="form-actions">
            <button type="submit" disabled={creatingCategory}>
              {creatingCategory ? (
                <>
                  <Spinner size="sm" />
                  <span>Adding...</span>
                </>
              ) : (
                "Add"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              disabled={creatingCategory}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="categories-list-content categories-list-scrollable">
        {categories.length === 0 ? (
          <EmptyState
            icon="📁"
            title="No Categories Yet"
            message="Organize your skills and challenges by creating categories. Start your journey by adding your first category!"
            actionLabel="Create Category"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          <ul className="categories-list-grid">
            {categories.map((category) => (
              <li
                key={category._id}
                className={`categories-list-item ${
                  selectedCategoryId === category._id ? "active" : ""
                }`}
                onClick={() => {
                  onCategorySelect(category._id);
                }}
              >
                {editingCategoryId === category._id ? (
                  <form
                    className="edit-form"
                    onSubmit={(e) => handleUpdateCategory(category._id, e)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      required
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="edit-form-actions">
                      <button
                        type="submit"
                        className="save-button"
                        disabled={updatingCategory === category._id}
                      >
                        {updatingCategory === category._id ? (
                          <>
                            <Spinner size="sm" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setEditingCategoryId(null)}
                        disabled={updatingCategory === category._id}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="categories-list-item-content">
                      <span className="category-name">{category.name}</span>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="categories-list-footer">
        <button
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add category"
        >
          +
        </button>
      </div>
    </div>
  );
}
