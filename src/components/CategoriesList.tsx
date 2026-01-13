import { useState, useEffect, useRef } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";
import { Spinner } from "./Spinner";
import { CategorySkeletonList } from "./CategorySkeleton";
import { BreadcrumbsSkeleton } from "./BreadcrumbsSkeleton";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { Breadcrumbs } from "./Breadcrumbs";
import { ConfirmationModal } from "./ConfirmationModal";
import { type ContextMenuItem } from "./ContextMenu";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";
import {
  validateItem,
  getValidationFeedback,
  validateName,
} from "../utils/validation";
import { BaseList } from "./BaseList";
import { FormModal } from "./FormModal";
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
  const toast = useToast();
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
  const [newCategoryNameError, setNewCategoryNameError] = useState<
    string | null
  >(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryNameError, setEditCategoryNameError] = useState<
    string | null
  >(null);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingCategories, setDeletingCategories] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Drag state for reordering (desktop)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
    null
  );
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(
    null
  );
  const dragStartIndexRef = useRef<number>(-1);

  // Touch drag state for reordering (mobile)
  const [touchDragStart, setTouchDragStart] = useState<{
    x: number;
    y: number;
    categoryId: string;
    initialIndex: number;
  } | null>(null);
  const [touchDragCurrent, setTouchDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [touchDragOffset, setTouchDragOffset] = useState<number>(0);
  const touchDragTimerRef = useRef<number | null>(null);

  // Swipe to close modal state

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
          const sorted = [...data].sort((a: Category, b: Category) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
          setCategories(sorted);
        }
      } else {
        const sorted = [...data].sort((a: Category, b: Category) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        setCategories(sorted);
      }
    } catch (err) {
      // Failed to load categories
    } finally {
      setLoading(false);
    }
  };

  // Real-time validation for new category
  useEffect(() => {
    if (newCategoryName.trim()) {
      const nameValidation = validateName(newCategoryName);
      setNewCategoryNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );
    } else {
      // Clear errors when field is empty (don't show errors until user tries to submit)
      setNewCategoryNameError(null);
    }
  }, [newCategoryName]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = validateItem({
      name: newCategoryName,
      description: newCategoryDescription,
    });

    if (!validation.isValid) {
      const errorMsg = getValidationFeedback(validation);
      // Show field-specific errors
      const nameValidation = validateName(newCategoryName);
      setNewCategoryNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );

      toast.showError(errorMsg || "Invalid input");
      hapticFeedback.error();
      return;
    }

    if (creatingCategory) return;

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
          const currentCategories = categories.map((c) => c._id);
          currentCategories.push(newCategory._id);
          localStorage.setItem(
            "categoryOrder",
            JSON.stringify(currentCategories)
          );
        }
      } else {
        const currentCategories = categories.map((c) => c._id);
        currentCategories.push(newCategory._id);
        localStorage.setItem(
          "categoryOrder",
          JSON.stringify(currentCategories)
        );
      }

      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryNameError(null);
      setShowAddForm(false);
      if (onShowAddFormChange) onShowAddFormChange(false);
      await loadCategories();
      hapticFeedback.success();
    } catch (err) {
      toast.showError(
        err instanceof Error ? err.message : "Failed to create category"
      );
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

  // Handle drag to reorder (desktop)
  const handleDragStart = (categoryId: string, index: number) => {
    setDraggedCategoryId(categoryId);
    dragStartIndexRef.current = index;
    hapticFeedback.medium();
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCategoryId && draggedCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategoryId(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetCategoryId: string,
    targetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryId(null);

    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      setDraggedCategoryId(null);
      return;
    }

    const startIndex = dragStartIndexRef.current;
    if (startIndex === -1 || startIndex === targetIndex) {
      setDraggedCategoryId(null);
      return;
    }

    const newCategories = [...categories];
    const [removed] = newCategories.splice(startIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    const newOrder = newCategories.map((c) => c._id);
    localStorage.setItem("categoryOrder", JSON.stringify(newOrder));

    setCategories(newCategories);
    setDraggedCategoryId(null);
    hapticFeedback.success();
  };

  const handleDragEnd = () => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
    dragStartIndexRef.current = -1;
  };

  // Touch drag handlers for mobile reordering
  const handleTouchDragStart = (categoryId: string, initialIndex: number) => {
    touchDragTimerRef.current = window.setTimeout(() => {
      setTouchDragStart({
        x: 0,
        y: 0,
        categoryId,
        initialIndex,
      });
      hapticFeedback.medium();
    }, 300);
  };

  const handleTouchDragMove = (e: React.TouchEvent, categoryId: string) => {
    if (!touchDragStart || touchDragStart.categoryId !== categoryId) {
      return;
    }

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentX = touch.clientX;

    if (!touchDragCurrent) {
      setTouchDragCurrent({ x: currentX, y: currentY });
      return;
    }

    const deltaY = currentY - touchDragCurrent.y;
    const deltaX = Math.abs(currentX - touchDragCurrent.x);

    if (deltaX < 30 && Math.abs(deltaY) > 5) {
      setTouchDragOffset(deltaY);
      setTouchDragCurrent({ x: currentX, y: currentY });

      const itemHeight = 60;
      const itemsAbove = Math.round(deltaY / itemHeight);
      const newIndex = Math.max(
        0,
        Math.min(
          categories.length - 1,
          touchDragStart.initialIndex + itemsAbove
        )
      );

      if (newIndex !== touchDragStart.initialIndex && categories.length > 0) {
        const newCategories = [...categories];
        const [draggedItem] = newCategories.splice(
          touchDragStart.initialIndex,
          1
        );
        newCategories.splice(newIndex, 0, draggedItem);
        setCategories(newCategories);

        const newOrder = newCategories.map((c) => c._id);
        localStorage.setItem("categoryOrder", JSON.stringify(newOrder));

        setTouchDragStart({
          ...touchDragStart,
          initialIndex: newIndex,
        });
        hapticFeedback.light();
      }
    }
  };

  const handleTouchDragEnd = () => {
    if (touchDragTimerRef.current) {
      clearTimeout(touchDragTimerRef.current);
      touchDragTimerRef.current = null;
    }
    setTouchDragStart(null);
    setTouchDragCurrent(null);
    setTouchDragOffset(0);
  };

  // Handle context menu
  // Context menu is now handled by BaseList

  const getContextMenuItems = (category: Category): ContextMenuItem[] => {
    return [
      {
        label: "Edit",
        icon: "✎",
        action: () => handleEditCategory(category),
      },
      {
        label: "Delete",
        icon: "🗑️",
        action: () => {
          handleDeleteCategory(category._id, category.name, {
            stopPropagation: () => {},
          } as React.MouseEvent);
        },
        destructive: true,
      },
    ];
  };

  // Use shared interaction hook - wrap onItemSelect to handle selection mode
  const handleItemSelect = (categoryId: string) => {
    if (selectionMode) {
      setSelectedCategoryIds((prev) => {
        const next = new Set(prev);
        if (next.has(categoryId)) {
          next.delete(categoryId);
          hapticFeedback.light();
        } else {
          next.add(categoryId);
          hapticFeedback.selection();
        }
        return next;
      });
    } else {
      onCategorySelect(categoryId);
    }
  };

  // Real-time validation for edit category
  useEffect(() => {
    if (editingCategoryId && editCategoryName.trim()) {
      const nameValidation = validateName(editCategoryName);
      setEditCategoryNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );
    } else {
      setEditCategoryNameError(null);
    }
  }, [editCategoryName, editingCategoryId]);

  const handleUpdateCategory = async (
    categoryId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();

    // Validate input
    const validation = validateItem({
      name: editCategoryName,
    });

    if (!validation.isValid) {
      const errorMsg = getValidationFeedback(validation);
      const nameValidation = validateName(editCategoryName);
      setEditCategoryNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );

      toast.showError(errorMsg || "Invalid input");
      hapticFeedback.error();
      return;
    }

    if (updatingCategory === categoryId) return;

    hapticFeedback.medium();
    setUpdatingCategory(categoryId);
    try {
      await categoryAPI.update(categoryId, {
        name: editCategoryName.trim(),
      });
      setEditingCategoryId(null);
      setEditCategoryNameError(null);
      await loadCategories();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setUpdatingCategory(null);
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    categoryId: string | null;
    categoryName: string;
    isBulk: boolean;
    categoryNames?: string;
    count?: number;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
    isBulk: false,
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
      isBulk: false,
    });
  };

  const handleDeleteSelectedCategories = () => {
    if (selectedCategoryIds.size === 0) return;

    const selectedCategories = categories.filter((category) =>
      selectedCategoryIds.has(category._id)
    );
    const categoryNames = selectedCategories
      .map((category) => category.name)
      .join(", ");

    setDeleteConfirmation({
      isOpen: true,
      categoryId: null,
      categoryName: "",
      isBulk: true,
      categoryNames,
      count: selectedCategoryIds.size,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.categoryId && !deleteConfirmation.isBulk) return;

    if (deleteConfirmation.isBulk) {
      if (selectedCategoryIds.size === 0) {
        setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
      setDeletingCategories(true);
      try {
        await Promise.all(
          Array.from(selectedCategoryIds).map((id) => categoryAPI.delete(id))
        );
        setSelectedCategoryIds(new Set());
        setSelectionMode(false);
        if (selectedCategoryId && selectedCategoryIds.has(selectedCategoryId)) {
          onCategorySelect(null);
        }
        await loadCategories();
        hapticFeedback.success();
      } catch (err) {
        hapticFeedback.error();
        toast.showError(
          err instanceof Error ? err.message : "Failed to delete categories"
        );
      } finally {
        setDeletingCategories(false);
      }
    } else {
      const categoryId = deleteConfirmation.categoryId!;
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
        toast.showError(
          err instanceof Error ? err.message : "Failed to delete category"
        );
      } finally {
        setDeletingCategory(null);
      }
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Expose actions and state to parent via window object (for App.tsx footer)
  useEffect(() => {
    const actionHandlers: Record<string, (e?: React.MouseEvent) => void> = {
      toggleAdd: () => {
        const newValue = !showAddForm;
        setShowAddForm(newValue);
        if (onShowAddFormChange) onShowAddFormChange(newValue);
      },
      toggleSelect: () => setSelectionMode(true),
      deleteSelected: handleDeleteSelectedCategories,
      exitSelect: () => {
        setSelectionMode(false);
        setSelectedCategoryIds(new Set());
      },
    };
    (window as any).__categoryFooterActions = actionHandlers;
    (window as any).__categorySelectionMode = selectionMode;
    (window as any).__categorySelectedIds = selectedCategoryIds;
    (window as any).__categoryDeleting = deletingCategories;
    return () => {
      delete (window as any).__categoryFooterActions;
      delete (window as any).__categorySelectionMode;
      delete (window as any).__categorySelectedIds;
      delete (window as any).__categoryDeleting;
    };
  }, [
    showAddForm,
    selectionMode,
    selectedCategoryIds,
    deletingCategories,
    categories,
    selectedCategoryId,
    onShowAddFormChange,
  ]);

  // Clear animation after it completes
  useEffect(() => {
    if (navDirection && onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 300); // Match unified transition duration
      return () => clearTimeout(timer);
    }
  }, [navDirection, onAnimationComplete]);

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
        <div className="header-title-section">
          <h2>Categories</h2>
          {categories.length > 0 && (
            <div className="list-stats">
              <span className="list-stat">
                {categories.length}{" "}
                {categories.length === 1 ? "category" : "categories"}
              </span>
              {(() => {
                const totalXP = categories.reduce(
                  (sum, cat) => sum + (cat.xp || 0),
                  0
                );
                const avgLevel =
                  categories.length > 0
                    ? Math.round(
                        categories.reduce(
                          (sum, cat) => sum + (cat.level || 1),
                          0
                        ) / categories.length
                      )
                    : 0;
                return (
                  <>
                    <span className="list-stat-separator"> • </span>
                    <span className="list-stat">
                      {totalXP.toLocaleString()} XP
                    </span>
                    <span className="list-stat-separator"> • </span>
                    <span className="list-stat">Avg LV {avgLevel}</span>
                  </>
                );
              })()}
            </div>
          )}
        </div>
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
        <BaseList<Category>
          items={categories}
          selectedItemId={selectedCategoryId}
          editingItemId={editingCategoryId}
          selectionMode={selectionMode}
          selectedItemIds={selectedCategoryIds}
          isMobile={isMobile}
          onItemSelect={handleItemSelect}
          onItemEdit={handleEditCategory}
          onItemDelete={(categoryId, categoryName, e) => {
            handleDeleteCategory(categoryId, categoryName, e);
          }}
          getContextMenuItems={getContextMenuItems}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onTouchDragStart={handleTouchDragStart}
          onTouchDragMove={handleTouchDragMove}
          onTouchDragEnd={handleTouchDragEnd}
          draggedItemId={draggedCategoryId}
          dragOverItemId={dragOverCategoryId}
          touchDragStart={
            touchDragStart
              ? {
                  itemId: touchDragStart.categoryId,
                  initialIndex: touchDragStart.initialIndex,
                }
              : null
          }
          touchDragOffset={touchDragOffset}
          itemClassName="category-item"
          listClassName="category-list"
          renderItemContent={(
            category,
            selectionMode,
            selectedItemIds,
            onSelectionToggle
          ) => (
            <>
              {selectionMode && (
                <input
                  type="checkbox"
                  className="challenge-selection-checkbox category-selection-checkbox"
                  checked={selectedItemIds.has(category._id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelectionToggle(category);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  aria-label={`Select ${category.name}`}
                />
              )}
              <div className="categories-list-item-content">
                <span className="category-name">{category.name}</span>
                <div className="category-item-stats">
                  <span className="item-stat">
                    {category.xp?.toLocaleString() || 0} XP
                  </span>
                  <span className="item-stat-separator"> • </span>
                  <span className="item-stat">LV {category.level || 1}</span>
                </div>
              </div>
            </>
          )}
          renderSwipeActions={(_category, swipeOffset) =>
            swipeOffset < 0 ? (
              <div className="challenge-swipe-indicator swipe-delete">
                <span className="swipe-icon">🗑️</span>
                <span className="swipe-text">Delete</span>
              </div>
            ) : null
          }
        />
      )}

      {/* Add Category Modal */}
      <FormModal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setNewCategoryNameError(null);
          if (onShowAddFormChange) onShowAddFormChange(false);
        }}
        title="Add Category"
        loading={creatingCategory}
      >
        <form className="edit-form" onSubmit={handleCreateCategory}>
          <div className="auth-field">
            <label htmlFor="new-category-name">Name *</label>
            <input
              id="new-category-name"
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className={newCategoryNameError ? "input-error" : ""}
              required
              autoFocus
            />
            {newCategoryNameError && (
              <span className="field-error">{newCategoryNameError}</span>
            )}
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
      </FormModal>

      {/* Edit Category Modal */}
      {editingCategoryId &&
        (() => {
          const category = categories.find((c) => c._id === editingCategoryId);
          if (!category) return null;

          return (
            <FormModal
              isOpen={!!editingCategoryId}
              onClose={() => {
                setEditingCategoryId(null);
                setEditCategoryNameError(null);
              }}
              title="Edit Category"
              loading={updatingCategory === category._id}
            >
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
                    className={editCategoryNameError ? "input-error" : ""}
                    required
                    autoFocus
                  />
                  {editCategoryNameError && (
                    <span className="field-error">{editCategoryNameError}</span>
                  )}
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
            </FormModal>
          );
        })()}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
        title={
          deleteConfirmation.isBulk ? "Delete Categories?" : "Delete Category?"
        }
        message={
          deleteConfirmation.isBulk
            ? `Are you sure you want to delete ${
                deleteConfirmation.count
              } categor${
                deleteConfirmation.count === 1 ? "y" : "ies"
              }? This will also delete all associated skills and challenges.`
            : `Are you sure you want to delete "${deleteConfirmation.categoryName}"? This will also delete all associated skills and challenges.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={
          deleteConfirmation.isBulk
            ? deletingCategories
            : deletingCategory === deleteConfirmation.categoryId
        }
      />

      {/* Context Menu is now handled by BaseList */}
    </div>
  );
}
