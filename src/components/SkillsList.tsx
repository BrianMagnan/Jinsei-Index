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
import { type ContextMenuItem } from "./ContextMenu";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";
import {
  validateItem,
  getValidationFeedback,
  validateName,
  validateDescription,
} from "../utils/validation";
import { BaseList } from "./BaseList";
import { FormModal } from "./FormModal";

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
  const [newSkillNameError, setNewSkillNameError] = useState<string | null>(
    null
  );
  const [newSkillDescriptionError, setNewSkillDescriptionError] = useState<
    string | null
  >(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillNameError, setEditSkillNameError] = useState<string | null>(
    null
  );
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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cleanup touch drag timer on unmount
  useEffect(() => {
    return () => {
      if (touchDragTimerRef.current) {
        clearTimeout(touchDragTimerRef.current);
      }
    };
  }, []);

  // Swipe to close modal state

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
      // Failed to load skills
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

  // Real-time validation for new skill
  useEffect(() => {
    if (newSkillName.trim() || newSkillDescription.trim()) {
      const nameValidation = validateName(newSkillName);
      setNewSkillNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );

      const descValidation = validateDescription(newSkillDescription);
      setNewSkillDescriptionError(
        descValidation.isValid ? null : descValidation.error || null
      );
    } else {
      setNewSkillNameError(null);
      setNewSkillDescriptionError(null);
    }
  }, [newSkillName, newSkillDescription]);

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = validateItem({
      name: newSkillName,
      description: newSkillDescription,
    });

    if (!validation.isValid) {
      const errorMsg = getValidationFeedback(validation);
      // Show field-specific errors
      const nameValidation = validateName(newSkillName);
      setNewSkillNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );
      const descValidation = validateDescription(newSkillDescription);
      setNewSkillDescriptionError(
        descValidation.isValid ? null : descValidation.error || null
      );

      toast.showError(errorMsg || "Invalid input");
      hapticFeedback.error();
      return;
    }

    if (creatingSkill) return;

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
      setNewSkillNameError(null);
      setNewSkillDescriptionError(null);
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

  // Real-time validation for edit skill
  useEffect(() => {
    if (editingSkillId && editSkillName.trim()) {
      const nameValidation = validateName(editSkillName);
      setEditSkillNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );
    } else {
      setEditSkillNameError(null);
    }
  }, [editSkillName, editingSkillId]);

  const handleUpdateSkill = async (skillId: string, e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = validateItem({
      name: editSkillName,
    });

    if (!validation.isValid) {
      const errorMsg = getValidationFeedback(validation);
      const nameValidation = validateName(editSkillName);
      setEditSkillNameError(
        nameValidation.isValid ? null : nameValidation.error || null
      );

      toast.showError(errorMsg || "Invalid input");
      hapticFeedback.error();
      return;
    }

    if (updatingSkill === skillId) return;

    hapticFeedback.medium();
    setUpdatingSkill(skillId);
    try {
      await skillAPI.update(skillId, {
        name: editSkillName.trim(),
      });
      setEditingSkillId(null);
      setEditSkillNameError(null);
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

  // Context menu is now handled by BaseList

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

  // Wrap onItemSelect to handle selection mode
  const handleItemSelect = (skillId: string) => {
    if (selectionMode) {
      setSelectedSkillIds((prev) => {
        const next = new Set(prev);
        if (next.has(skillId)) {
          next.delete(skillId);
          hapticFeedback.light();
        } else {
          next.add(skillId);
          hapticFeedback.selection();
        }
        return next;
      });
    } else {
      onSkillSelect(skillId);
    }
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
      }, 300); // Match unified transition duration
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
            <>
              <h2>{displayCategory?.name || "Skills"}</h2>
              {skills.length > 0 && (
                <div className="list-stats">
                  <span className="list-stat">
                    {skills.length} {skills.length === 1 ? "skill" : "skills"}
                  </span>
                  {displayCategory && (
                    <>
                      <span className="list-stat-separator"> • </span>
                      <span className="list-stat">
                        {displayCategory.xp?.toLocaleString() || 0} XP
                      </span>
                      <span className="list-stat-separator"> • </span>
                      <span className="list-stat">
                        LV {displayCategory.level || 1}
                      </span>
                    </>
                  )}
                </div>
              )}
            </>
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
        <BaseList<Skill>
          items={skills}
          selectedItemId={null}
          editingItemId={editingSkillId}
          selectionMode={selectionMode}
          selectedItemIds={selectedSkillIds}
          isMobile={isMobile}
          onItemSelect={handleItemSelect}
          onItemEdit={handleEditSkill}
          onItemDelete={(skillId, skillName, e) => {
            handleDeleteSkill(skillId, skillName, e);
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
          draggedItemId={draggedSkillId}
          dragOverItemId={dragOverSkillId}
          touchDragStart={
            touchDragStart
              ? {
                  itemId: touchDragStart.skillId,
                  initialIndex: touchDragStart.initialIndex,
                }
              : null
          }
          touchDragOffset={touchDragOffset}
          itemClassName="skill-item"
          listClassName="skill-list"
          renderItemContent={(
            skill,
            selectionMode,
            selectedItemIds,
            onSelectionToggle
          ) => (
            <>
              {selectionMode && (
                <input
                  type="checkbox"
                  className="challenge-selection-checkbox skill-selection-checkbox"
                  checked={selectedItemIds.has(skill._id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelectionToggle(skill);
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
                  <div className="skill-item-stats">
                    <span className="item-stat">
                      {skill.xp?.toLocaleString() || 0} XP
                    </span>
                    <span className="item-stat-separator"> • </span>
                    <span className="item-stat">LV {skill.level || 1}</span>
                  </div>
                </div>
                {skill.description && (
                  <div className="skill-description">{skill.description}</div>
                )}
              </div>
            </>
          )}
          renderSwipeActions={(_skill, swipeOffset) =>
            swipeOffset < 0 ? (
              <div className="challenge-swipe-indicator swipe-delete">
                <span className="swipe-icon">🗑️</span>
                <span className="swipe-text">Delete</span>
              </div>
            ) : null
          }
        />
      )}

      {/* Add Skill Modal */}
      <FormModal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setNewSkillNameError(null);
          setNewSkillDescriptionError(null);
          if (onShowAddFormChange) onShowAddFormChange(false);
        }}
        title="Add Skill"
        loading={creatingSkill}
      >
        <form className="edit-form" onSubmit={handleCreateSkill}>
          <div className="auth-field">
            <label htmlFor="new-skill-name">Name *</label>
            <input
              id="new-skill-name"
              type="text"
              placeholder="Skill name"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className={newSkillNameError ? "input-error" : ""}
              required
              autoFocus
            />
            {newSkillNameError && (
              <span className="field-error">{newSkillNameError}</span>
            )}
          </div>
          <div className="auth-field">
            <label htmlFor="new-skill-description">Description</label>
            <textarea
              id="new-skill-description"
              placeholder="Skill description (optional)"
              value={newSkillDescription}
              onChange={(e) => setNewSkillDescription(e.target.value)}
              className={newSkillDescriptionError ? "input-error" : ""}
              rows={3}
            />
            {newSkillDescriptionError && (
              <span className="field-error">{newSkillDescriptionError}</span>
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
      </FormModal>

      {/* Edit Skill Modal */}
      {editingSkillId &&
        (() => {
          const skill = skills.find((s) => s._id === editingSkillId);
          if (!skill) return null;

          return (
            <FormModal
              isOpen={!!editingSkillId}
              onClose={() => {
                setEditingSkillId(null);
                setEditSkillNameError(null);
              }}
              title="Edit Skill"
              loading={updatingSkill === skill._id}
            >
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
                    className={editSkillNameError ? "input-error" : ""}
                    required
                    autoFocus
                  />
                  {editSkillNameError && (
                    <span className="field-error">{editSkillNameError}</span>
                  )}
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
            </FormModal>
          );
        })()}

      {/* Context Menu is now handled by BaseList */}

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
