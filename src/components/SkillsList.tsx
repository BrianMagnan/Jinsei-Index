import { useState, useEffect, useRef } from "react";
import { skillAPI, categoryAPI } from "../services/api";
import type { Skill, Category } from "../types";
import { Spinner } from "./Spinner";
import { Breadcrumbs } from "./Breadcrumbs";
import { BreadcrumbsSkeleton } from "./BreadcrumbsSkeleton";
import { Skeleton } from "./Skeleton";
import { SkillSkeletonList } from "./SkillSkeleton";
import { EmptyState } from "./EmptyState";
import { ConfirmationModal } from "./ConfirmationModal";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";

interface SkillsListProps {
  categoryId: string;
  category: Category | null;
  onSkillSelect: (skillId: string) => void;
  onCategoryUpdate?: () => void;
  onCategoryDelete?: () => void;
  onBackToCategories?: () => void;
  navDirection?: "forward" | "backward" | null;
  onAnimationComplete?: () => void;
  onShowAddForm?: boolean;
  onShowAddFormChange?: (show: boolean) => void;
}

export function SkillsList({
  categoryId,
  category,
  onSkillSelect,
  onCategoryUpdate,
  onBackToCategories,
  navDirection,
  onAnimationComplete,
  onShowAddForm: showAddFormProp,
  onShowAddFormChange,
}: SkillsListProps) {
  const toast = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(showAddFormProp || false);

  // Sync with parent state
  useEffect(() => {
    if (showAddFormProp !== undefined) {
      setShowAddForm(showAddFormProp);
    }
  }, [showAddFormProp]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const [dragOverSkillId, setDragOverSkillId] = useState<string | null>(null);

  // Touch drag state for reordering (mobile)
  const [touchDragStart, setTouchDragStart] = useState<{
    x: number;
    y: number;
    skillId: string;
    initialIndex: number;
  } | null>(null);
  const [touchDragCurrent, setTouchDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [touchDragOffset, setTouchDragOffset] = useState<number>(0);
  const touchDragTimerRef = useRef<number | null>(null);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [localCategory, setLocalCategory] = useState<Category | null>(category);
  const [deletingSkill, setDeletingSkill] = useState<string | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingSkills, setDeletingSkills] = useState(false);

  // Swipe gesture state for skill list items
  const [itemSwipeStart, setItemSwipeStart] = useState<{
    x: number;
    y: number;
    skillId: string;
  } | null>(null);
  const [itemSwipeEnd, setItemSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [swipedSkillId, setSwipedSkillId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuSkillId, setContextMenuSkillId] = useState<string | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Long press state (unified drag + menu)
  const longPressTimerRef = useRef<number | null>(null);
  const dragStartTimerRef = useRef<number | null>(null);
  const longPressSkillIdRef = useRef<string | null>(null);
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

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await skillAPI.getAll(categoryId);

      // Apply saved order from localStorage
      const savedOrder = localStorage.getItem(`skillOrder-${categoryId}`);
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const orderedSkills = orderArray
            .map((id) => data.find((skill: Skill) => skill._id === id))
            .filter((skill): skill is Skill => skill !== undefined);

          // Add any new skills that aren't in the saved order to the end
          const existingIds = new Set(orderArray);
          const newSkills = data.filter(
            (skill: Skill) => !existingIds.has(skill._id)
          );

          // Sort new skills by creation date (newest last) to ensure they appear at bottom
          newSkills.sort((a: Skill, b: Skill) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB; // Oldest first, so newest appear at end
          });

          setSkills([...orderedSkills, ...newSkills]);
        } catch {
          // If parsing fails, sort by creation date (newest last)
          const sorted = [...data].sort((a: Skill, b: Skill) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
          setSkills(sorted);
        }
      } else {
        // No saved order: sort by creation date (newest last) so new skills appear at bottom
        const sorted = [...data].sort((a: Skill, b: Skill) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        setSkills(sorted);
      }
    } catch (err) {
      console.error("Failed to load skills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, [categoryId]);

  useEffect(() => {
    setLocalCategory(category);
  }, [category]);

  // Expose actions and state to parent via window object (for App.tsx footer)
  useEffect(() => {
    const actionHandlers: Record<string, (e?: React.MouseEvent) => void> = {
      toggleAdd: () => {
        const newValue = !showAddForm;
        setShowAddForm(newValue);
        if (onShowAddFormChange) onShowAddFormChange(newValue);
      },
      toggleSelect: () => setSelectionMode(true),
      deleteSelected: handleDeleteSelectedSkills,
      exitSelect: () => {
        setSelectionMode(false);
        setSelectedSkillIds(new Set());
      },
    };
    // Store in a way parent can access
    (window as any).__skillFooterActions = actionHandlers;
    (window as any).__skillSelectionMode = selectionMode;
    (window as any).__skillSelectedIds = selectedSkillIds;
    (window as any).__skillDeleting = deletingSkills;
    return () => {
      delete (window as any).__skillFooterActions;
      delete (window as any).__skillSelectionMode;
      delete (window as any).__skillSelectedIds;
      delete (window as any).__skillDeleting;
    };
  }, [
    showAddForm,
    selectionMode,
    selectedSkillIds,
    deletingSkills,
    skills,
    onShowAddFormChange,
  ]);

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || creatingSkill) return;

    setCreatingSkill(true);
    try {
      const newSkill = await skillAPI.create({
        name: newSkillName.trim(),
        description: newSkillDescription.trim() || undefined,
        category: categoryId,
      });

      // Add the new skill to the end of the saved order
      const savedOrder = localStorage.getItem(`skillOrder-${categoryId}`);
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          orderArray.push(newSkill._id);
          localStorage.setItem(
            `skillOrder-${categoryId}`,
            JSON.stringify(orderArray)
          );
        } catch {
          // If parsing fails, create new order with the new skill at the end
          const currentSkills = skills.map((s) => s._id);
          currentSkills.push(newSkill._id);
          localStorage.setItem(
            `skillOrder-${categoryId}`,
            JSON.stringify(currentSkills)
          );
        }
      } else {
        // If no saved order exists, create one with existing skills + new skill at the end
        const currentSkills = skills.map((s) => s._id);
        currentSkills.push(newSkill._id);
        localStorage.setItem(
          `skillOrder-${categoryId}`,
          JSON.stringify(currentSkills)
        );
      }

      setNewSkillName("");
      setNewSkillDescription("");
      setShowAddForm(false);
      if (onShowAddFormChange) onShowAddFormChange(false);
      await loadSkills();
      hapticFeedback.success();
    } catch (err) {
      toast.showError(
        err instanceof Error ? err.message : "Failed to create skill"
      );
    } finally {
      setCreatingSkill(false);
    }
  };

  const handleEditSkill = (skill: Skill, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    hapticFeedback.light();
    setEditingSkillId(skill._id);
    setEditSkillName(skill.name);
  };

  const handleUpdateSkill = async (skillId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (updatingSkill === skillId) return;

    hapticFeedback.medium();
    setUpdatingSkill(skillId);
    try {
      await skillAPI.update(skillId, {
        name: editSkillName.trim(),
      });
      setEditingSkillId(null);
      await loadSkills();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to update skill"
      );
    } finally {
      setUpdatingSkill(null);
    }
  };

  const saveSkillOrder = (newOrder: Skill[]) => {
    const orderIds = newOrder.map((skill) => skill._id);
    localStorage.setItem(`skillOrder-${categoryId}`, JSON.stringify(orderIds));
  };

  const handleDragStart = (skillId: string, _index?: number) => {
    setDraggedSkillId(skillId);
  };

  const handleDragOver = (e: React.DragEvent, skillId: string) => {
    e.preventDefault();
    if (draggedSkillId && draggedSkillId !== skillId) {
      setDragOverSkillId(skillId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSkillId(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetSkillId: string,
    targetIndex: number
  ) => {
    e.preventDefault();
    if (!draggedSkillId || draggedSkillId === targetSkillId) {
      setDraggedSkillId(null);
      setDragOverSkillId(null);
      return;
    }

    const draggedIndex = skills.findIndex(
      (skill) => skill._id === draggedSkillId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSkills = [...skills];
    const [draggedItem] = newSkills.splice(draggedIndex, 1);
    newSkills.splice(targetIndex, 0, draggedItem);

    setSkills(newSkills);
    saveSkillOrder(newSkills);
    setDraggedSkillId(null);
    setDragOverSkillId(null);
    hapticFeedback.success();
  };

  const handleDragEnd = () => {
    setDraggedSkillId(null);
    setDragOverSkillId(null);
  };

  // Touch drag handlers for mobile reordering
  const handleTouchDragStart = (skillId: string, initialIndex: number) => {
    // Start timer for drag activation (long press)
    touchDragTimerRef.current = window.setTimeout(() => {
      setTouchDragStart({
        x: 0,
        y: 0,
        skillId,
        initialIndex,
      });
      hapticFeedback.medium();
    }, 300); // 300ms long press to start drag
  };

  const handleTouchDragMove = (e: React.TouchEvent, skillId: string) => {
    if (!touchDragStart || touchDragStart.skillId !== skillId) {
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
        Math.min(skills.length - 1, touchDragStart.initialIndex + itemsAbove)
      );

      if (newIndex !== touchDragStart.initialIndex && skills.length > 0) {
        const newSkills = [...skills];
        const [draggedItem] = newSkills.splice(touchDragStart.initialIndex, 1);
        newSkills.splice(newIndex, 0, draggedItem);
        setSkills(newSkills);
        saveSkillOrder(newSkills);

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
    skill: Skill
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

    setContextMenuSkillId(skill._id);
    hapticFeedback.medium();
  };

  // Get context menu items for a skill
  const getContextMenuItems = (skill: Skill): ContextMenuItem[] => {
    return [
      {
        label: "Edit",
        icon: "✏️",
        action: () => {
          handleEditSkill(skill);
        },
      },
      {
        label: "Delete",
        icon: "🗑️",
        action: () => {
          handleDeleteSkill(skill._id, skill.name, {
            stopPropagation: () => {},
          } as React.MouseEvent);
        },
        destructive: true,
      },
    ];
  };

  // Unified long-press handlers: drag with movement, menu without movement
  const handleLongPressStart = (
    skill: Skill,
    event: React.MouseEvent | React.TouchEvent,
    _index: number
  ) => {
    longPressTriggeredRef.current = false;
    hasMovedRef.current = false;
    longPressSkillIdRef.current = skill._id;

    // Store initial position for movement detection
    if ("touches" in event) {
      const touch = event.touches[0];
      longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      longPressPositionRef.current = { x: event.clientX, y: event.clientY };
    }

    // Start drag timer (shorter - 300ms) - enables drag after this delay if movement occurs
    dragStartTimerRef.current = window.setTimeout(() => {
      if (
        longPressSkillIdRef.current === skill._id &&
        hasMovedRef.current &&
        !longPressTriggeredRef.current &&
        !draggedSkillId
      ) {
        // 300ms passed and movement detected - start drag
        hapticFeedback.medium();
        handleDragStart(skill._id);
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
        longPressSkillIdRef.current === skill._id &&
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
        handleContextMenu(syntheticEvent, skill);
      }
    }, MENU_DELAY);
  };

  const handleLongPressMove = (
    skill: Skill,
    event: React.MouseEvent | React.TouchEvent,
    _index: number
  ) => {
    if (
      longPressSkillIdRef.current !== skill._id ||
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
        if (!draggedSkillId && !dragStartTimerRef.current) {
          // Timer already fired (300ms passed) - start drag immediately since movement detected
          hapticFeedback.medium();
          handleDragStart(skill._id);
        }

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
    longPressSkillIdRef.current = null;
    longPressPositionRef.current = null;
    hasMovedRef.current = false;
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = localCategory || category;
    if (!cat || !editCategoryName.trim() || updatingCategory) return;

    setUpdatingCategory(true);
    try {
      await categoryAPI.update(cat._id, {
        name: editCategoryName.trim(),
      });
      setEditingCategory(false);
      if (onCategoryUpdate) {
        onCategoryUpdate();
      }
    } catch (err) {
      toast.showError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setUpdatingCategory(false);
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    skillId: string | null;
    skillName: string;
    isBulk: boolean;
    skillNames?: string;
    count?: number;
  }>({
    isOpen: false,
    skillId: null,
    skillName: "",
    isBulk: false,
  });

  const handleDeleteSkill = (
    skillId: string,
    skillName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingSkill === skillId) return;

    hapticFeedback.medium();
    setDeleteConfirmation({
      isOpen: true,
      skillId,
      skillName,
      isBulk: false,
    });
  };

  const handleDeleteSelectedSkills = () => {
    if (selectedSkillIds.size === 0) return;

    const selectedSkills = skills.filter((skill) =>
      selectedSkillIds.has(skill._id)
    );
    const skillNames = selectedSkills.map((skill) => skill.name).join(", ");

    setDeleteConfirmation({
      isOpen: true,
      skillId: null,
      skillName: "",
      isBulk: true,
      skillNames,
      count: selectedSkillIds.size,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.skillId && !deleteConfirmation.isBulk) return;

    if (deleteConfirmation.isBulk) {
      // Bulk delete
      if (selectedSkillIds.size === 0) {
        setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
      setDeletingSkills(true);
      try {
        // Delete all selected skills
        await Promise.all(
          Array.from(selectedSkillIds).map((id) => skillAPI.delete(id))
        );
        // Clear selection and exit selection mode
        setSelectedSkillIds(new Set());
        setSelectionMode(false);
        await loadSkills();
        hapticFeedback.success();
      } catch (err) {
        hapticFeedback.error();
        toast.showError(
          err instanceof Error ? err.message : "Failed to delete skills"
        );
      } finally {
        setDeletingSkills(false);
      }
    } else {
      // Single delete
      const skillId = deleteConfirmation.skillId!;
      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
      setDeletingSkill(skillId);
      try {
        await skillAPI.delete(skillId);
        await loadSkills();
        hapticFeedback.success();
      } catch (err) {
        hapticFeedback.error();
        toast.showError(
          err instanceof Error ? err.message : "Failed to delete skill"
        );
      } finally {
        setDeletingSkill(null);
      }
    }
  };

  // Apply animation class based on navigation direction
  // Swapped: forward (down hierarchy) = slide from right, backward (up) = slide from left
  const animationClass =
    navDirection === "forward"
      ? "slide-in-right"
      : navDirection === "backward"
      ? "slide-in-left"
      : "";

  // Clear animation after it completes - must be before early returns
  useEffect(() => {
    if (navDirection && onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 350); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [navDirection, onAnimationComplete]);

  // Early return with full skeleton when loading or category not available
  if (loading || (!localCategory && !category)) {
    return (
      <div className={`skills-list ${animationClass}`}>
        <BreadcrumbsSkeleton />
        <div className="section-header">
          <Skeleton width="150px" height="2rem" />
        </div>
        <ul className="skill-list">
          <SkillSkeletonList count={5} />
        </ul>
      </div>
    );
  }

  // Get the category to use (localCategory takes precedence)
  const displayCategory = localCategory || category;

  return (
    <div className={`skills-list ${animationClass}`}>
      <Breadcrumbs
        category={displayCategory}
        skill={null}
        onCategoriesClick={onBackToCategories}
        onCategoryClick={undefined}
      />
      <div className="section-header">
        <div className="header-title-section">
          {editingCategory ? (
            <form className="edit-form" onSubmit={handleUpdateCategory}>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                required
                autoFocus
              />
              <div className="edit-form-actions">
                <button
                  type="submit"
                  className="save-button"
                  disabled={updatingCategory}
                >
                  {updatingCategory ? <Spinner size="sm" /> : "Save"}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditingCategory(false)}
                  disabled={updatingCategory}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <h2>{displayCategory?.name || "Skills"}</h2>
          )}
        </div>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No Skills Yet"
          message="Skills help you track your progress in different areas. Add your first skill to start building your journey!"
          actionLabel="Add Skill"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <ul className="skill-list">
          {skills.map((skill, index) => (
            <li
              key={skill._id}
              className={`skill-item ${
                selectionMode && selectedSkillIds.has(skill._id)
                  ? "selected"
                  : ""
              } ${
                draggedSkillId === skill._id ||
                touchDragStart?.skillId === skill._id
                  ? "dragging"
                  : ""
              } ${dragOverSkillId === skill._id ? "drag-over" : ""} ${
                swipedSkillId === skill._id ? "swiping" : ""
              } ${
                contextMenuSkillId === skill._id ? "context-menu-active" : ""
              }`}
              draggable={
                !isMobile &&
                !editingSkillId &&
                !selectionMode &&
                draggedSkillId !== skill._id &&
                !longPressTriggeredRef.current &&
                (hasMovedRef.current || dragStartTimerRef.current === null)
              }
              onDragStart={() => {
                if (!isMobile && !editingSkillId) {
                  // Cancel long-press timers when native drag starts
                  handleLongPressEnd();
                  handleDragStart(skill._id, index);
                }
              }}
              onDragOver={(e) => {
                if (!isMobile) {
                  handleDragOver(e, skill._id);
                }
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                if (!isMobile) {
                  handleDrop(e, skill._id, index);
                }
              }}
              onDragEnd={handleDragEnd}
              onClick={() => {
                // Don't trigger click if long press was just triggered or if swiping or dragging
                if (
                  longPressTriggeredRef.current ||
                  swipedSkillId === skill._id ||
                  contextMenuPosition ||
                  draggedSkillId ||
                  touchDragStart?.skillId === skill._id
                ) {
                  return;
                }

                if (selectionMode) {
                  setSelectedSkillIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(skill._id)) {
                      next.delete(skill._id);
                      hapticFeedback.light();
                    } else {
                      next.add(skill._id);
                      hapticFeedback.selection();
                    }
                    return next;
                  });
                } else if (editingSkillId !== skill._id) {
                  // Handle double-click detection (desktop only)
                  if (!isMobile) {
                    clickCountRef.current += 1;

                    // Clear existing timer
                    if (clickTimerRef.current) {
                      clearTimeout(clickTimerRef.current);
                    }

                    // Wait to see if it's a double-click
                    clickTimerRef.current = window.setTimeout(() => {
                      // Single click - select skill (only if long-press wasn't triggered)
                      if (
                        clickCountRef.current === 1 &&
                        !longPressTriggeredRef.current
                      ) {
                        onSkillSelect(skill._id);
                      }
                      clickCountRef.current = 0;
                    }, 300); // 300ms delay to detect double-click
                  } else {
                    // Mobile: immediate select
                    onSkillSelect(skill._id);
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
                    handleEditSkill(skill);
                  }, 0);
                }
              }}
              onContextMenu={(e) => {
                // Desktop: right-click to show context menu
                if (!isMobile && !selectionMode) {
                  handleContextMenu(e, skill);
                }
              }}
              onMouseDown={(e) => {
                // Desktop: long-press for drag (with movement) or menu (without movement)
                if (
                  e.button === 0 &&
                  !editingSkillId &&
                  !selectionMode &&
                  !isMobile
                ) {
                  handleLongPressStart(skill, e, index);
                }
              }}
              onMouseMove={(e) => {
                // Desktop: track movement during long-press
                if (
                  !isMobile &&
                  !editingSkillId &&
                  !selectionMode &&
                  longPressSkillIdRef.current === skill._id
                ) {
                  handleLongPressMove(skill, e, index);
                }
              }}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={(e) => {
                if (editingSkillId !== skill._id && !selectionMode) {
                  const touch = e.touches[0];
                  const initialIndex = skills.findIndex(
                    (s) => s._id === skill._id
                  );

                  // Start long-press timer for menu
                  if (!editingSkillId) {
                    handleLongPressStart(skill, e, index);
                  }
                  // Start touch drag timer for reordering
                  if (initialIndex >= 0) {
                    handleTouchDragStart(skill._id, initialIndex);
                  }

                  // Track swipe for delete (horizontal)
                  setItemSwipeStart({
                    x: touch.clientX,
                    y: touch.clientY,
                    skillId: skill._id,
                  });
                  setItemSwipeEnd(null);
                  setSwipeOffset(0);
                }
              }}
              onTouchMove={(e) => {
                if (itemSwipeStart && itemSwipeStart.skillId === skill._id) {
                  const currentX = e.touches[0].clientX;
                  const currentY = e.touches[0].clientY;
                  setItemSwipeEnd({ x: currentX, y: currentY });

                  // Calculate swipe offset for visual feedback
                  const deltaX = currentX - itemSwipeStart.x;
                  const deltaY = Math.abs(currentY - itemSwipeStart.y);

                  // If touch drag is active, handle vertical drag
                  if (touchDragStart?.skillId === skill._id) {
                    handleTouchDragMove(e, skill._id);
                    // Cancel swipe and long press when dragging
                    handleLongPressEnd();
                    setItemSwipeStart(null);
                    return;
                  }

                  // Only allow horizontal swipes (ignore if vertical movement is too large)
                  if (deltaY < 30) {
                    setSwipeOffset(deltaX);
                    setSwipedSkillId(skill._id);
                    // Cancel long press and drag if swiping horizontally
                    if (Math.abs(deltaX) > 10) {
                      handleLongPressEnd();
                      handleTouchDragEnd();
                    }
                  } else if (deltaY > 30) {
                    // Cancel horizontal swipe if vertical movement is too large
                    setItemSwipeStart(null);
                    setSwipedSkillId(null);
                    setSwipeOffset(0);
                  }
                }
              }}
              onTouchEnd={() => {
                handleLongPressEnd();
                handleTouchDragEnd();

                if (
                  itemSwipeStart &&
                  itemSwipeStart.skillId === skill._id &&
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
                      handleDeleteSkill(skill._id, skill.name, {
                        stopPropagation: () => {},
                      } as React.MouseEvent);
                    }
                  }
                }

                // Reset swipe state
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedSkillId(null);
                setSwipeOffset(0);
              }}
              onTouchCancel={() => {
                handleLongPressEnd();
                handleTouchDragEnd();
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedSkillId(null);
                setSwipeOffset(0);
              }}
              style={{
                transform:
                  touchDragStart?.skillId === skill._id
                    ? `translateY(${touchDragOffset}px)`
                    : swipedSkillId === skill._id
                    ? `translateX(${Math.max(
                        -100,
                        Math.min(100, swipeOffset)
                      )}px)`
                    : undefined,
                transition:
                  touchDragStart?.skillId === skill._id ||
                  swipedSkillId === skill._id ||
                  draggedSkillId === skill._id
                    ? "none"
                    : "transform 0.2s ease-out",
              }}
            >
              <>
                {/* Selection checkbox - only visible in selection mode */}
                {selectionMode && (
                  <input
                    type="checkbox"
                    className="challenge-selection-checkbox skill-selection-checkbox"
                    checked={selectedSkillIds.has(skill._id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedSkillIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(skill._id)) {
                          next.delete(skill._id);
                          hapticFeedback.light();
                        } else {
                          next.add(skill._id);
                          hapticFeedback.selection();
                        }
                        return next;
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    aria-label={`Select ${skill.name}`}
                  />
                )}
                <div className="skill-content">
                  <div className="skill-header">
                    <div className="skill-name">{skill.name}</div>
                  </div>
                  {skill.description && (
                    <div className="skill-description">{skill.description}</div>
                  )}
                  {/* Swipe action indicators */}
                  {swipedSkillId === skill._id && (
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

      {/* Add Skill Modal */}
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
              <h3>Add Skill</h3>
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
            <form className="edit-form" onSubmit={handleCreateSkill}>
              <div className="auth-field">
                <label htmlFor="new-skill-name">Name *</label>
                <input
                  id="new-skill-name"
                  type="text"
                  placeholder="Skill name"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
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
                  disabled={creatingSkill}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={creatingSkill}
                >
                  {creatingSkill ? (
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

      {/* Edit Skill Modal */}
      {editingSkillId && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setEditingSkillId(null);
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
                setEditingSkillId(null);
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
              const skill = skills.find((s) => s._id === editingSkillId);
              if (!skill) return null;

              return (
                <>
                  <div className="challenge-action-modal-header">
                    <h3>Edit Skill</h3>
                    <button
                      className="challenge-action-modal-close"
                      onClick={() => {
                        hapticFeedback.light();
                        setEditingSkillId(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form
                    className="edit-form"
                    onSubmit={(e) => handleUpdateSkill(skill._id, e)}
                  >
                    <div className="auth-field">
                      <label htmlFor="edit-skill-name">Name *</label>
                      <input
                        id="edit-skill-name"
                        type="text"
                        value={editSkillName}
                        onChange={(e) => setEditSkillName(e.target.value)}
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
                          setEditingSkillId(null);
                        }}
                        disabled={updatingSkill === skill._id}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="save-button"
                        disabled={updatingSkill === skill._id}
                      >
                        {updatingSkill === skill._id ? (
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

      {/* Context Menu */}
      {contextMenuPosition && contextMenuSkillId && (
        <ContextMenu
          items={getContextMenuItems(
            skills.find((s) => s._id === contextMenuSkillId)!
          )}
          position={contextMenuPosition}
          onClose={() => {
            setContextMenuPosition(null);
            setContextMenuSkillId(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
        title={deleteConfirmation.isBulk ? "Delete Skills?" : "Delete Skill?"}
        message={
          deleteConfirmation.isBulk
            ? `Are you sure you want to delete ${
                deleteConfirmation.count
              } skill${
                deleteConfirmation.count === 1 ? "" : "s"
              }? This will also delete all associated challenges.`
            : `Are you sure you want to delete "${deleteConfirmation.skillName}"? This will also delete all associated challenges.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={
          deleteConfirmation.isBulk
            ? deletingSkills
            : deletingSkill === deleteConfirmation.skillId
        }
      />
    </div>
  );
}
