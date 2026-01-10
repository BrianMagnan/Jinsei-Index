import { useState, useEffect, useRef } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";
import { Spinner } from "./Spinner";
import { CategorySkeletonList } from "./CategorySkeleton";
import { EmptyState } from "./EmptyState";
import { ConfirmationModal } from "./ConfirmationModal";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";
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
  const toast = useToast();
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

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuCategoryId, setContextMenuCategoryId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Long press state (menu only - no drag in modal)
  const longPressTimerRef = useRef<number | null>(null);
  const longPressCategoryIdRef = useRef<string | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);
  const MENU_DELAY = 600; // ms - time before menu shows

  // Track clicks for double-click detection
  const clickTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef<number>(0);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    setEditCategoryDescription(category.description || "");
  };

  // Handle context menu (right-click or long-press)
  const handleContextMenu = (
    event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
    category: Category
  ) => {
    if ('preventDefault' in event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // For mobile, position doesn't matter (bottom sheet style)
    // For desktop, use cursor position
    if (isMobile) {
      // Mobile: bottom sheet style - position will be handled by ContextMenu component
      setContextMenuPosition({ x: 0, y: 0 });
    } else if ('clientX' in event && 'clientY' in event) {
      // Desktop: right-click or mouse event - show menu at cursor position
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    } else {
      // Fallback: center of screen
      setContextMenuPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    
    setContextMenuCategoryId(category._id);
    hapticFeedback.medium();
  };

  // Get context menu items for a category
  const getContextMenuItems = (category: Category): ContextMenuItem[] => {
    return [
      {
        label: "Edit",
        icon: "✎",
        action: () => {
          handleEditCategory(category);
          setContextMenuPosition(null);
          setContextMenuCategoryId(null);
        },
      },
      {
        label: "Delete",
        icon: "🗑️",
        action: () => {
          handleDeleteCategory(category._id, category.name, {
            stopPropagation: () => {},
          } as React.MouseEvent);
          setContextMenuPosition(null);
          setContextMenuCategoryId(null);
        },
        destructive: true,
      },
    ];
  };

  // Long-press handler for menu (CategoriesModal doesn't have drag functionality)
  const handleLongPressStart = (category: Category, event: React.MouseEvent | React.TouchEvent) => {
    longPressTriggeredRef.current = false;
    longPressCategoryIdRef.current = category._id;
    
    // Store initial position for context menu
    if ('touches' in event) {
      const touch = event.touches[0];
      longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      longPressPositionRef.current = { x: event.clientX, y: event.clientY };
    }
    
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressCategoryIdRef.current === category._id) {
        longPressTriggeredRef.current = true;
        hapticFeedback.medium();
        // Show context menu
        const syntheticEvent = {
          clientX: longPressPositionRef.current?.x || window.innerWidth / 2,
          clientY: longPressPositionRef.current?.y || window.innerHeight / 2,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.MouseEvent;
        handleContextMenu(syntheticEvent, category);
      }
    }, MENU_DELAY); // 600ms long press
  };

  const handleLongPressEnd = () => {
    // Reset the flag after a short delay to allow click handler to check it
    setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 100);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressCategoryIdRef.current = null;
    longPressPositionRef.current = null;
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
      toast.showError(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    } finally {
      setDeletingCategory(null);
    }
  };

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

        <div className="categories-modal-content">
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
                      } ${contextMenuCategoryId === category._id ? "context-menu-active" : ""}`}
                      onClick={() => {
                        // Don't trigger select if context menu is active or editing
                        if (contextMenuPosition || editingCategoryId === category._id) {
                          return;
                        }

                        // Handle double-click detection (desktop only)
                        if (!isMobile) {
                          clickCountRef.current += 1;
                          
                          // Clear existing timer
                          if (clickTimerRef.current) {
                            clearTimeout(clickTimerRef.current);
                          }
                          
                          // Wait to see if it's a double-click
                          clickTimerRef.current = window.setTimeout(() => {
                            // Single click - select category (only if long-press wasn't triggered)
                            if (clickCountRef.current === 1 && !longPressTriggeredRef.current) {
                              handleCategoryClick(category._id);
                            }
                            clickCountRef.current = 0;
                          }, 300); // 300ms delay to detect double-click
                        } else {
                          // Mobile: immediate select
                          handleCategoryClick(category._id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Desktop: double-click to edit
                        if (!isMobile) {
                          // Clear single-click timer immediately
                          if (clickTimerRef.current) {
                            clearTimeout(clickTimerRef.current);
                            clickTimerRef.current = null;
                          }
                          clickCountRef.current = 0;
                          // Small delay to ensure onClick doesn't fire
                          setTimeout(() => {
                            handleEditCategory(category);
                          }, 0);
                        }
                      }}
                      onContextMenu={(e) => {
                        // Desktop: right-click to show context menu
                        if (!isMobile) {
                          handleContextMenu(e, category);
                        }
                      }}
                      onMouseDown={(e) => {
                        // Desktop: long-press for menu
                        if (e.button === 0 && !editingCategoryId && !isMobile) {
                          handleLongPressStart(category, e);
                        }
                      }}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      onTouchStart={(e) => {
                        // Mobile: long-press for menu
                        if (!editingCategoryId) {
                          handleLongPressStart(category, e);
                        }
                      }}
                      onTouchEnd={handleLongPressEnd}
                      onTouchCancel={handleLongPressEnd}
                    >
                      <div className="categories-modal-item-content">
                        <span className="category-name">{category.name}</span>
                      </div>
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

      {/* Edit Category Modal */}
      {editingCategoryId && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setEditingCategoryId(null);
          }}
        >
          <div
            className="challenge-edit-modal"
            onClick={(e) => e.stopPropagation()}
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
                      <label htmlFor="edit-category-name-modal">Name *</label>
                      <input
                        id="edit-category-name-modal"
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="auth-field">
                      <label htmlFor="edit-category-description-modal">
                        Description
                      </label>
                      <textarea
                        id="edit-category-description-modal"
                        value={editCategoryDescription}
                        onChange={(e) =>
                          setEditCategoryDescription(e.target.value)
                        }
                        rows={3}
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
      {/* Context Menu */}
      {contextMenuPosition && contextMenuCategoryId && (
        <ContextMenu
          items={getContextMenuItems(
            filteredCategories.find((c) => c._id === contextMenuCategoryId)!
          )}
          position={contextMenuPosition}
          onClose={() => {
            setContextMenuPosition(null);
            setContextMenuCategoryId(null);
          }}
          mobile={isMobile}
        />
      )}

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
    </>
  );
}
