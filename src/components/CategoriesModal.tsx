import { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";
import { Spinner } from "./Spinner";
import { CategorySkeletonList } from "./CategorySkeleton";
import { EmptyState } from "./EmptyState";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { hapticFeedback } from "../utils/haptic";
import "../App.css";

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onAddCategory?: () => void;
}

export function CategoriesModal({
  isOpen,
  onClose,
  selectedCategoryId,
  onCategorySelect,
  onAddCategory,
}: CategoriesModalProps) {
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
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

    hapticFeedback.medium();
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
      hapticFeedback.success();
      if (onAddCategory) {
        onAddCategory();
      }
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleEditCategory = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.light();
    setEditingCategoryId(category._id);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || "");
  };

  const handleUpdateCategory = async (
    categoryId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();
    if (updatingCategory === categoryId) return;

    hapticFeedback.medium();
    setUpdatingCategory(categoryId);
    try {
      await categoryAPI.update(categoryId, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || undefined,
      });
      setEditingCategoryId(null);
      await loadCategories();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setUpdatingCategory(null);
    }
  };

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingCategory === categoryId) return;

    hapticFeedback.medium();
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This will also delete all associated skills and challenges.`
      )
    ) {
      return;
    }

    setDeletingCategory(categoryId);
    try {
      await categoryAPI.delete(categoryId);
      if (selectedCategoryId === categoryId) {
        onCategorySelect(null);
      }
      await loadCategories();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCategory(null);
    }
  };

  const { pullDistance, isPulling, containerProps } = usePullToRefresh({
    onRefresh: loadCategories,
    enabled: isOpen && !loading && !creatingCategory,
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    hapticFeedback.selection();
    onCategorySelect(categoryId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="categories-modal-overlay"
        onClick={() => {
          hapticFeedback.light();
          onClose();
        }}
      />
      <div className="categories-modal">
        <div className="categories-modal-header">
          <h2>Categories</h2>
          <button
            className="categories-modal-close"
            onClick={() => {
              hapticFeedback.light();
              onClose();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="categories-modal-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
                onClick={() => {
                  hapticFeedback.light();
                  setShowAddForm(false);
                }}
                disabled={creatingCategory}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div
          className="categories-modal-content"
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
          {loading ? (
            <ul className="categories-modal-list">
              <CategorySkeletonList count={6} />
            </ul>
          ) : (
            <>
              {filteredCategories.length === 0 && searchQuery ? (
                <EmptyState
                  icon="🔍"
                  title="No Categories Found"
                  message={`No categories match "${searchQuery}". Try a different search term.`}
                  className="search-empty-state"
                />
              ) : (
                <ul className="categories-modal-list">
                  {filteredCategories.map((category) => (
                    <li
                      key={category._id}
                      className={`categories-modal-item ${
                        selectedCategoryId === category._id ? "active" : ""
                      }`}
                      onClick={() => handleCategoryClick(category._id)}
                    >
                      {editingCategoryId === category._id ? (
                        <form
                          className="edit-form"
                          onSubmit={(e) =>
                            handleUpdateCategory(category._id, e)
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) =>
                              setEditCategoryName(e.target.value)
                            }
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
                          <div className="categories-modal-item-content">
                            <span className="category-name">
                              {category.name}
                            </span>
                            {category.xp > 0 && (
                              <span className="category-stats">
                                XP: {category.xp} | LV: {category.level}
                              </span>
                            )}
                          </div>
                          <div className="category-actions">
                            <button
                              className="edit-button"
                              onClick={(e) => handleEditCategory(category, e)}
                              title="Edit category"
                              disabled={
                                deletingCategory === category._id ||
                                updatingCategory === category._id
                              }
                            >
                              ✎
                            </button>
                            <button
                              className="delete-button"
                              onClick={(e) =>
                                handleDeleteCategory(
                                  category._id,
                                  category.name,
                                  e
                                )
                              }
                              title="Delete category"
                              disabled={
                                deletingCategory === category._id ||
                                updatingCategory === category._id
                              }
                            >
                              {deletingCategory === category._id ? (
                                <Spinner size="sm" />
                              ) : (
                                "×"
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="categories-modal-footer">
          <button
            className="add-button"
            onClick={() => {
              hapticFeedback.light();
              setShowAddForm(!showAddForm);
            }}
            title="Add category"
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}
