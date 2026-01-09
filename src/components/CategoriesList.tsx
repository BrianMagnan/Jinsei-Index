import { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";
import { Spinner } from "./Spinner";
import { CategorySkeletonList } from "./CategorySkeleton";
import { BreadcrumbsSkeleton } from "./BreadcrumbsSkeleton";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { Breadcrumbs } from "./Breadcrumbs";
import { ConfirmationModal } from "./ConfirmationModal";
import { hapticFeedback } from "../utils/haptic";
import "../App.css";

interface CategoriesListProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  navDirection?: "forward" | "backward" | null;
  onAnimationComplete?: () => void;
  onShowAddForm?: boolean;
  onShowAddFormChange?: (show: boolean) => void;
}

export function CategoriesList({
  selectedCategoryId,
  onCategorySelect,
  navDirection,
  onAnimationComplete,
  onShowAddForm: showAddFormProp,
  onShowAddFormChange,
}: CategoriesListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(showAddFormProp || false);

  // Sync with parent state
  useEffect(() => {
    if (showAddFormProp !== undefined) {
      setShowAddForm(showAddFormProp);
    }
  }, [showAddFormProp]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Swipe gesture state for category list items
  const [itemSwipeStart, setItemSwipeStart] = useState<{
    x: number;
    y: number;
    categoryId: string;
  } | null>(null);
  const [itemSwipeEnd, setItemSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [swipedCategoryId, setSwipedCategoryId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Swipe to close modal state
  const [modalSwipeStart, setModalSwipeStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [modalSwipeEnd, setModalSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [modalSwipeOffset, setModalSwipeOffset] = useState<number>(0);

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

          // Sort new categories by creation date (newest last) so they appear at bottom
          newCategories.sort((a: Category, b: Category) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB; // Oldest first, so newest appear at end
          });

          setCategories([...orderedCategories, ...newCategories]);
        } catch {
          // If parsing fails, sort by creation date (newest last)
          const sorted = [...data].sort((a: Category, b: Category) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
          setCategories(sorted);
        }
      } else {
        // No saved order: sort by creation date (newest last) so new categories appear at bottom
        const sorted = [...data].sort((a: Category, b: Category) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        setCategories(sorted);
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
      // Add the new category to the end of the saved order
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          orderArray.push(newCategory._id);
          localStorage.setItem("categoryOrder", JSON.stringify(orderArray));
        } catch {
          // If parsing fails, create new order with the new category at the end
          const currentCategories = categories.map((c) => c._id);
          currentCategories.push(newCategory._id);
          localStorage.setItem(
            "categoryOrder",
            JSON.stringify(currentCategories)
          );
        }
      } else {
        // If no saved order exists, create one with existing categories + new category at the end
        const currentCategories = categories.map((c) => c._id);
        currentCategories.push(newCategory._id);
        localStorage.setItem(
          "categoryOrder",
          JSON.stringify(currentCategories)
        );
      }

      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddForm(false);
      if (onShowAddFormChange) onShowAddFormChange(false);
      await loadCategories();
      hapticFeedback.success();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleEditCategory = (category: Category, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    hapticFeedback.light();
    setEditingCategoryId(category._id);
    setEditCategoryName(category.name);
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

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    categoryId: string | null;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });

  const handleDeleteCategory = (
    categoryId: string,
    categoryName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingCategory === categoryId) return;

    hapticFeedback.medium();
    setDeleteConfirmation({
      isOpen: true,
      categoryId,
      categoryName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.categoryId) return;

    const categoryId = deleteConfirmation.categoryId;
    setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
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

  useEffect(() => {
    loadCategories();
  }, []);

  // Clear animation after it completes - must be before early returns
  useEffect(() => {
    if (navDirection && onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 350); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [navDirection, onAnimationComplete]);

  // Apply animation class based on navigation direction
  // Swapped: forward (down hierarchy) = slide from right, backward (up) = slide from left
  const animationClass =
    navDirection === "forward"
      ? "slide-in-right"
      : navDirection === "backward"
      ? "slide-in-left"
      : "";

  if (loading) {
    return (
      <div className={`categories-list ${animationClass}`}>
        <BreadcrumbsSkeleton />
        <div className="section-header">
          <Skeleton width="150px" height="2rem" />
        </div>
        <ul className="category-list">
          <CategorySkeletonList count={6} />
        </ul>
      </div>
    );
  }

  return (
    <div className={`categories-list ${animationClass}`}>
      <Breadcrumbs category={null} skill={null} onCategoriesClick={undefined} />
      <div className="section-header">
        <h2>Categories</h2>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No Categories Yet"
          message="Organize your skills and challenges by creating categories. Start your journey by adding your first category!"
          actionLabel="Create Category"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <ul className="category-list">
          {categories.map((category) => (
            <li
              key={category._id}
              className={`category-item ${
                selectedCategoryId === category._id ? "active" : ""
              } ${swipedCategoryId === category._id ? "swiping" : ""}`}
              onClick={() => {
                onCategorySelect(category._id);
              }}
              onTouchStart={(e) => {
                setItemSwipeStart({
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY,
                  categoryId: category._id,
                });
                setItemSwipeEnd(null);
                setSwipeOffset(0);
              }}
              onTouchMove={(e) => {
                if (
                  itemSwipeStart &&
                  itemSwipeStart.categoryId === category._id
                ) {
                  const currentX = e.touches[0].clientX;
                  const currentY = e.touches[0].clientY;
                  setItemSwipeEnd({ x: currentX, y: currentY });

                  // Calculate swipe offset for visual feedback
                  const deltaX = currentX - itemSwipeStart.x;
                  const deltaY = Math.abs(currentY - itemSwipeStart.y);

                  // Only allow horizontal swipes (ignore if vertical movement is too large)
                  if (deltaY < 30) {
                    setSwipeOffset(deltaX);
                    setSwipedCategoryId(category._id);
                  }
                }
              }}
              onTouchEnd={() => {
                if (
                  itemSwipeStart &&
                  itemSwipeStart.categoryId === category._id &&
                  itemSwipeEnd
                ) {
                  const deltaX = itemSwipeEnd.x - itemSwipeStart.x;
                  const deltaY = Math.abs(itemSwipeEnd.y - itemSwipeStart.y);
                  const minSwipeDistance = 80;

                  // Only handle horizontal swipes
                  if (deltaY < 50 && Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX < 0) {
                      // Swipe left - delete
                      hapticFeedback.medium();
                      handleDeleteCategory(category._id, category.name, {
                        stopPropagation: () => {},
                      } as React.MouseEvent);
                    }
                  }
                }

                // Reset swipe state
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedCategoryId(null);
                setSwipeOffset(0);
              }}
              onTouchCancel={() => {
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedCategoryId(null);
                setSwipeOffset(0);
              }}
              style={{
                transform:
                  swipedCategoryId === category._id
                    ? `translateX(${Math.max(
                        -100,
                        Math.min(100, swipeOffset)
                      )}px)`
                    : undefined,
                transition:
                  swipedCategoryId === category._id
                    ? "none"
                    : "transform 0.2s ease-out",
              }}
            >
              <>
                <div className="categories-list-item-content">
                  <span className="category-name">{category.name}</span>
                  {/* Swipe action indicators */}
                  {swipedCategoryId === category._id && (
                    <>
                      {swipeOffset < 0 && (
                        <div className="challenge-swipe-indicator swipe-delete">
                          <span className="swipe-icon">🗑️</span>
                          <span className="swipe-text">Delete</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCategory(category, e);
                  }}
                  title="Edit category"
                  disabled={
                    deletingCategory === category._id ||
                    updatingCategory === category._id
                  }
                >
                  ✎
                </button>
              </>
            </li>
          ))}
        </ul>
      )}

      {/* Add Category Modal */}
      {showAddForm && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setShowAddForm(false);
            if (onShowAddFormChange) onShowAddFormChange(false);
          }}
          onTouchStart={(e) => {
            setModalSwipeStart({
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            });
            setModalSwipeEnd(null);
            setModalSwipeOffset(0);
          }}
          onTouchMove={(e) => {
            if (modalSwipeStart) {
              const currentY = e.touches[0].clientY;
              const currentX = e.touches[0].clientX;
              setModalSwipeEnd({ x: currentX, y: currentY });
              const deltaY = currentY - modalSwipeStart.y;
              const deltaX = Math.abs(currentX - modalSwipeStart.x);
              // Only allow vertical swipes down
              if (deltaY > 0 && deltaY > deltaX) {
                setModalSwipeOffset(deltaY);
              }
            }
          }}
          onTouchEnd={() => {
            if (modalSwipeStart && modalSwipeEnd) {
              const deltaY = modalSwipeEnd.y - modalSwipeStart.y;
              const minSwipeDistance = 100;
              if (deltaY > minSwipeDistance) {
                hapticFeedback.light();
                setShowAddForm(false);
                if (onShowAddFormChange) onShowAddFormChange(false);
              }
            }
            setModalSwipeStart(null);
            setModalSwipeEnd(null);
            setModalSwipeOffset(0);
          }}
        >
          <div
            className="challenge-edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform:
                modalSwipeOffset > 0
                  ? `translateY(${Math.min(modalSwipeOffset, 200)}px)`
                  : undefined,
              transition:
                modalSwipeOffset > 0 ? "none" : "transform 0.2s ease-out",
            }}
          >
            <div className="challenge-action-modal-header">
              <h3>Add Category</h3>
              <button
                className="challenge-action-modal-close"
                onClick={() => {
                  hapticFeedback.light();
                  setShowAddForm(false);
                  if (onShowAddFormChange) onShowAddFormChange(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className="edit-form" onSubmit={handleCreateCategory}>
              <div className="auth-field">
                <label htmlFor="new-category-name">Name *</label>
                <input
                  id="new-category-name"
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="edit-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    hapticFeedback.light();
                    setShowAddForm(false);
                    if (onShowAddFormChange) onShowAddFormChange(false);
                  }}
                  disabled={creatingCategory}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={creatingCategory}
                >
                  {creatingCategory ? (
                    <>
                      <Spinner size="sm" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategoryId && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setEditingCategoryId(null);
          }}
          onTouchStart={(e) => {
            setModalSwipeStart({
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            });
            setModalSwipeEnd(null);
            setModalSwipeOffset(0);
          }}
          onTouchMove={(e) => {
            if (modalSwipeStart) {
              const currentY = e.touches[0].clientY;
              const currentX = e.touches[0].clientX;
              setModalSwipeEnd({ x: currentX, y: currentY });
              const deltaY = currentY - modalSwipeStart.y;
              const deltaX = Math.abs(currentX - modalSwipeStart.x);
              // Only allow vertical swipes down
              if (deltaY > 0 && deltaY > deltaX) {
                setModalSwipeOffset(deltaY);
              }
            }
          }}
          onTouchEnd={() => {
            if (modalSwipeStart && modalSwipeEnd) {
              const deltaY = modalSwipeEnd.y - modalSwipeStart.y;
              const minSwipeDistance = 100;
              if (deltaY > minSwipeDistance) {
                hapticFeedback.light();
                setEditingCategoryId(null);
              }
            }
            setModalSwipeStart(null);
            setModalSwipeEnd(null);
            setModalSwipeOffset(0);
          }}
        >
          <div
            className="challenge-edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform:
                modalSwipeOffset > 0
                  ? `translateY(${Math.min(modalSwipeOffset, 200)}px)`
                  : undefined,
              transition:
                modalSwipeOffset > 0 ? "none" : "transform 0.2s ease-out",
            }}
          >
            {(() => {
              const category = categories.find(
                (c) => c._id === editingCategoryId
              );
              if (!category) return null;

              return (
                <>
                  <div className="challenge-action-modal-header">
                    <h3>Edit Category</h3>
                    <button
                      className="challenge-action-modal-close"
                      onClick={() => {
                        hapticFeedback.light();
                        setEditingCategoryId(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form
                    className="edit-form"
                    onSubmit={(e) => handleUpdateCategory(category._id, e)}
                  >
                    <div className="auth-field">
                      <label htmlFor="edit-category-name">Name *</label>
                      <input
                        id="edit-category-name"
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="edit-form-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                          hapticFeedback.light();
                          setEditingCategoryId(null);
                        }}
                        disabled={updatingCategory === category._id}
                      >
                        Cancel
                      </button>
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
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${deleteConfirmation.categoryName}"? This will also delete all associated skills and challenges.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deletingCategory === deleteConfirmation.categoryId}
      />
    </div>
  );
}
