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
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";
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
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingCategories, setDeletingCategories] = useState(false);

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

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuCategoryId, setContextMenuCategoryId] = useState<
    string | null
  >(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Long press state (unified drag + menu)
  const longPressTimerRef = useRef<number | null>(null);
  const dragStartTimerRef = useRef<number | null>(null);
  const longPressCategoryIdRef = useRef<string | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const dragThreshold = 10; // pixels - movement distance before drag starts
  const DRAG_START_DELAY = 300; // ms - time before drag can start
  const MENU_DELAY = 600; // ms - time before menu shows if no movement

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

  // Cleanup long press and drag timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (dragStartTimerRef.current) {
        clearTimeout(dragStartTimerRef.current);
      }
      if (touchDragTimerRef.current) {
        clearTimeout(touchDragTimerRef.current);
      }
    };
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

  // Handle drag to reorder
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

    // Reorder categories array
    const newCategories = [...categories];
    const [removed] = newCategories.splice(startIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    // Update localStorage order
    const newOrder = newCategories.map((c) => c._id);
    localStorage.setItem("categoryOrder", JSON.stringify(newOrder));

    // Update state
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
    // Start timer for drag activation (long press)
    touchDragTimerRef.current = window.setTimeout(() => {
      setTouchDragStart({
        x: 0,
        y: 0,
        categoryId,
        initialIndex,
      });
      hapticFeedback.medium();
    }, 300); // 300ms long press to start drag
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

    // Only allow vertical drag (ignore horizontal swipes)
    if (deltaX < 30 && Math.abs(deltaY) > 5) {
      setTouchDragOffset(deltaY);
      setTouchDragCurrent({ x: currentX, y: currentY });

      // Calculate which item we're over
      const itemHeight = 60; // Mobile item height
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

        // Update localStorage order
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

  // Handle context menu (right-click or long-press)
  const handleContextMenu = (
    event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
    category: Category
  ) => {
    if ("preventDefault" in event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // For mobile, position doesn't matter (bottom sheet style)
    // For desktop, use cursor position
    if (isMobile) {
      // Mobile: bottom sheet style - position will be handled by ContextMenu component
      setContextMenuPosition({ x: 0, y: 0 });
    } else if ("clientX" in event && "clientY" in event) {
      // Desktop: right-click or mouse event - show menu at cursor position
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    } else {
      // Fallback: center of screen
      setContextMenuPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }

    setContextMenuCategoryId(category._id);
    hapticFeedback.medium();
  };

  const closeContextMenu = () => {
    setContextMenuPosition(null);
    setContextMenuCategoryId(null);
    longPressPositionRef.current = null;
  };

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

  // Unified long-press handlers: drag with movement, menu without movement
  const handleLongPressStart = (
    category: Category,
    event: React.MouseEvent | React.TouchEvent,
    index: number
  ) => {
    longPressTriggeredRef.current = false;
    hasMovedRef.current = false;
    longPressCategoryIdRef.current = category._id;

    // Store initial position for movement detection
    if ("touches" in event) {
      const touch = event.touches[0];
      longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      longPressPositionRef.current = { x: event.clientX, y: event.clientY };
    }

    // Start drag timer (shorter - 300ms) - enables drag after this delay if movement occurs
    // When this fires, if movement has been detected, we start drag
    dragStartTimerRef.current = window.setTimeout(() => {
      if (
        longPressCategoryIdRef.current === category._id &&
        hasMovedRef.current &&
        !longPressTriggeredRef.current &&
        !draggedCategoryId
      ) {
        // 300ms passed and movement detected - start drag
        hapticFeedback.medium();
        handleDragStart(category._id, index);
        // Cancel menu timer since we're dragging
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }, DRAG_START_DELAY);

    // Start menu timer (longer - 600ms, only if no movement)
    longPressTimerRef.current = window.setTimeout(() => {
      if (
        longPressCategoryIdRef.current === category._id &&
        !hasMovedRef.current &&
        !longPressTriggeredRef.current
      ) {
        // No movement - show menu
        longPressTriggeredRef.current = true;
        hapticFeedback.medium();
        // Cancel drag timer if it's still running
        if (dragStartTimerRef.current) {
          clearTimeout(dragStartTimerRef.current);
          dragStartTimerRef.current = null;
        }
        // Show context menu
        const syntheticEvent = {
          clientX: longPressPositionRef.current?.x || window.innerWidth / 2,
          clientY: longPressPositionRef.current?.y || window.innerHeight / 2,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.MouseEvent;
        handleContextMenu(syntheticEvent, category);
      }
    }, MENU_DELAY);
  };

  const handleLongPressMove = (
    category: Category,
    event: React.MouseEvent | React.TouchEvent,
    index: number
  ) => {
    if (
      longPressCategoryIdRef.current !== category._id ||
      longPressTriggeredRef.current
    )
      return;

    // Get current position
    const currentX =
      "touches" in event ? event.touches[0].clientX : event.clientX;
    const currentY =
      "touches" in event ? event.touches[0].clientY : event.clientY;

    if (longPressPositionRef.current) {
      // Calculate movement distance
      const deltaX = Math.abs(currentX - longPressPositionRef.current.x);
      const deltaY = Math.abs(currentY - longPressPositionRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If moved beyond threshold, mark as moved
      if (distance > dragThreshold) {
        hasMovedRef.current = true;

        // Cancel menu timer if user is moving
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        // Start drag if enough time has passed (DRAG_START_DELAY) and movement detected
        // If drag timer has already fired (300ms passed), start drag immediately
        // Otherwise, wait for the timer to fire (it will check hasMovedRef)
        if (!draggedCategoryId && !dragStartTimerRef.current) {
          // Timer already fired (300ms passed) - start drag immediately since movement detected
          hapticFeedback.medium();
          handleDragStart(category._id, index);
        }
        // If timer is still running, it will fire and check hasMovedRef, then start drag

        // Update position
        longPressPositionRef.current = { x: currentX, y: currentY };
      }
    }
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
    if (dragStartTimerRef.current) {
      clearTimeout(dragStartTimerRef.current);
      dragStartTimerRef.current = null;
    }
    longPressCategoryIdRef.current = null;
    longPressPositionRef.current = null;
    hasMovedRef.current = false;
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
      // Bulk delete
      if (selectedCategoryIds.size === 0) {
        setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
      setDeletingCategories(true);
      try {
        // Delete all selected categories
        await Promise.all(
          Array.from(selectedCategoryIds).map((id) => categoryAPI.delete(id))
        );
        // Clear selection and exit selection mode
        setSelectedCategoryIds(new Set());
        setSelectionMode(false);
        // Clear selection if a selected category was deleted
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
      // Single delete
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
    // Store in a way parent can access
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
          {categories.map((category, index) => (
            <li
              key={category._id}
              className={`category-item ${
                selectedCategoryId === category._id ? "active" : ""
              } ${
                selectionMode && selectedCategoryIds.has(category._id)
                  ? "selected"
                  : ""
              } ${swipedCategoryId === category._id ? "swiping" : ""} ${
                draggedCategoryId === category._id ||
                touchDragStart?.categoryId === category._id
                  ? "dragging"
                  : ""
              } ${dragOverCategoryId === category._id ? "drag-over" : ""} ${
                contextMenuCategoryId === category._id
                  ? "context-menu-active"
                  : ""
              }`}
              draggable={
                !isMobile &&
                !editingCategoryId &&
                !selectionMode &&
                draggedCategoryId !== category._id &&
                !longPressTriggeredRef.current
              }
              onDragStart={() => {
                if (!isMobile && !editingCategoryId) {
                  // Cancel long-press timers when native drag starts
                  handleLongPressEnd();
                  handleDragStart(category._id, index);
                }
              }}
              onDragOver={(e) => {
                if (!isMobile) {
                  handleDragOver(e, category._id);
                }
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                if (!isMobile) {
                  handleDrop(e, category._id, index);
                }
              }}
              onDragEnd={handleDragEnd}
              onClick={() => {
                // Don't trigger click if long press was just triggered or if swiping or dragging
                if (
                  longPressTriggeredRef.current ||
                  swipedCategoryId === category._id ||
                  contextMenuPosition ||
                  draggedCategoryId ||
                  touchDragStart?.categoryId === category._id
                ) {
                  return;
                }

                if (selectionMode) {
                  setSelectedCategoryIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(category._id)) {
                      next.delete(category._id);
                      hapticFeedback.light();
                    } else {
                      next.add(category._id);
                      hapticFeedback.selection();
                    }
                    return next;
                  });
                } else if (editingCategoryId !== category._id) {
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
                      if (
                        clickCountRef.current === 1 &&
                        !longPressTriggeredRef.current
                      ) {
                        onCategorySelect(category._id);
                      }
                      clickCountRef.current = 0;
                    }, 300); // 300ms delay to detect double-click
                  } else {
                    // Mobile: immediate select
                    onCategorySelect(category._id);
                  }
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Desktop: double-click to edit
                if (!isMobile && !selectionMode) {
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
                if (!isMobile && !selectionMode) {
                  handleContextMenu(e, category);
                }
              }}
              onMouseDown={(e) => {
                // Desktop: long-press for drag (with movement) or menu (without movement)
                if (
                  e.button === 0 &&
                  !editingCategoryId &&
                  !selectionMode &&
                  !isMobile
                ) {
                  handleLongPressStart(category, e, index);
                }
              }}
              onMouseMove={(e) => {
                // Desktop: track movement during long-press
                if (
                  !isMobile &&
                  !editingCategoryId &&
                  !selectionMode &&
                  longPressCategoryIdRef.current === category._id
                ) {
                  handleLongPressMove(category, e, index);
                }
              }}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={(e) => {
                if (editingCategoryId !== category._id && !selectionMode) {
                  const touch = e.touches[0];
                  const initialIndex = categories.findIndex(
                    (c) => c._id === category._id
                  );

                  // Start long press timer for menu
                  handleLongPressStart(category, e, index);
                  // Start touch drag timer for reordering
                  if (initialIndex >= 0) {
                    handleTouchDragStart(category._id, initialIndex);
                  }

                  // Track swipe for delete (horizontal)
                  setItemSwipeStart({
                    x: touch.clientX,
                    y: touch.clientY,
                    categoryId: category._id,
                  });
                  setItemSwipeEnd(null);
                  setSwipeOffset(0);

                  // Start long-press timer for menu
                  if (!editingCategoryId) {
                    handleLongPressStart(category, e, index);
                  }
                  // Start touch drag timer for reordering
                  if (initialIndex >= 0) {
                    handleTouchDragStart(category._id, initialIndex);
                  }
                }
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

                  // If touch drag is active, handle vertical drag
                  if (touchDragStart?.categoryId === category._id) {
                    handleTouchDragMove(e, category._id);
                    // Cancel swipe and long press when dragging
                    handleLongPressEnd();
                    setItemSwipeStart(null);
                    return;
                  }

                  // Only allow horizontal swipes (ignore if vertical movement is too large)
                  if (deltaY < 30) {
                    setSwipeOffset(deltaX);
                    setSwipedCategoryId(category._id);
                    // Cancel long press and drag if swiping horizontally
                    if (Math.abs(deltaX) > 10) {
                      handleLongPressEnd();
                      handleTouchDragEnd();
                    }
                  } else if (deltaY > 30) {
                    // Cancel horizontal swipe if vertical movement is too large
                    setItemSwipeStart(null);
                    setSwipedCategoryId(null);
                    setSwipeOffset(0);
                  }
                }
              }}
              onTouchEnd={() => {
                handleLongPressEnd();
                handleTouchDragEnd();

                // Handle swipe-to-delete (horizontal)
                if (
                  itemSwipeStart &&
                  itemSwipeStart.categoryId === category._id &&
                  itemSwipeEnd &&
                  !touchDragStart
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
                handleLongPressEnd();
                handleTouchDragEnd();
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedCategoryId(null);
                setSwipeOffset(0);
              }}
              style={{
                transform:
                  touchDragStart?.categoryId === category._id
                    ? `translateY(${touchDragOffset}px)`
                    : swipedCategoryId === category._id
                    ? `translateX(${Math.max(
                        -100,
                        Math.min(100, swipeOffset)
                      )}px)`
                    : undefined,
                transition:
                  touchDragStart?.categoryId === category._id ||
                  swipedCategoryId === category._id ||
                  draggedCategoryId === category._id
                    ? "none"
                    : "transform 0.2s ease-out",
              }}
            >
              <>
                {/* Selection checkbox - only visible in selection mode */}
                {selectionMode && (
                  <input
                    type="checkbox"
                    className="challenge-selection-checkbox category-selection-checkbox"
                    checked={selectedCategoryIds.has(category._id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedCategoryIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(category._id)) {
                          next.delete(category._id);
                          hapticFeedback.light();
                        } else {
                          next.add(category._id);
                          hapticFeedback.selection();
                        }
                        return next;
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    aria-label={`Select ${category.name}`}
                  />
                )}
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

      {/* Context Menu */}
      {contextMenuPosition && contextMenuCategoryId && (
        <ContextMenu
          items={getContextMenuItems(
            categories.find((c) => c._id === contextMenuCategoryId)!
          )}
          position={contextMenuPosition}
          onClose={closeContextMenu}
          mobile={isMobile}
        />
      )}
    </div>
  );
}
