import { useState, useEffect, useRef } from "react";
import { challengeAPI, achievementAPI, skillAPI } from "../services/api";
import type { SkillWithHierarchy, Challenge } from "../types";
import { Spinner } from "./Spinner";
import { Breadcrumbs } from "./Breadcrumbs";
import { BreadcrumbsSkeleton } from "./BreadcrumbsSkeleton";
import { Skeleton } from "./Skeleton";
import { ChallengeSkeletonList } from "./ChallengeSkeleton";
import { EmptyState } from "./EmptyState";
import { ConfirmationModal } from "./ConfirmationModal";
import { hapticFeedback } from "../utils/haptic";
import { linkifyText } from "../utils/linkifyText";
import { useToast } from "../contexts/ToastContext";
import {
  addTodoItem,
  removeTodoItem,
  getTodoItems,
} from "../utils/todoStorage";
import {
  addDailyItem,
  removeDailyItem,
  getDailyItems,
} from "../utils/dailyStorage";

interface ChallengesListProps {
  skillId: string;
  onBackToCategory?: () => void;
  onBackToCategories?: () => void;
  initialChallengeId?: string;
  navDirection?: "forward" | "backward" | null;
  onAnimationComplete?: () => void;
  onFooterStateChange?: (state: {
    showAddForm: boolean;
    selectionMode: boolean;
    selectedIds: Set<string>;
    deleting: boolean;
    selectedChallengeId: string | null;
    selectedChallenge: {
      id: string;
      name: string;
      inTodo: boolean;
      inDaily: boolean;
      isDeleting: boolean;
      isUpdating: boolean;
      isCompleting: boolean;
    } | null;
  }) => void;
}

export function ChallengesList({
  skillId,
  onBackToCategory,
  onBackToCategories,
  initialChallengeId,
  navDirection,
  onAnimationComplete,
  onFooterStateChange,
}: ChallengesListProps) {
  const toast = useToast();
  const [skill, setSkill] = useState<SkillWithHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [updatingChallenge, setUpdatingChallenge] = useState<string | null>(
    null
  );
  const [deletingChallenge, setDeletingChallenge] = useState<string | null>(
    null
  );
  const [completingChallenge, setCompletingChallenge] = useState<string | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChallengeName, setNewChallengeName] = useState("");
  const [newChallengeDescription, setNewChallengeDescription] = useState("");
  const [newChallengeXPReward, setNewChallengeXPReward] = useState(5);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null
  );
  const [editChallengeName, setEditChallengeName] = useState("");
  const [editChallengeDescription, setEditChallengeDescription] = useState("");
  const [editChallengeXPReward, setEditChallengeXPReward] = useState(5);
  const [draggedChallengeId, setDraggedChallengeId] = useState<string | null>(
    null
  );
  const [dragOverChallengeId, setDragOverChallengeId] = useState<string | null>(
    null
  );
  const [todoChallengeIds, setTodoChallengeIds] = useState<Set<string>>(
    new Set()
  );
  const [dailyChallengeIds, setDailyChallengeIds] = useState<Set<string>>(
    new Set()
  );
  const [actionModalChallengeId, setActionModalChallengeId] = useState<
    string | null
  >(null);
  const [completedChallengeId, setCompletedChallengeId] = useState<
    string | null
  >(null);
  const [listSelectionModalOpen, setListSelectionModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    challengeId: string | null;
    challengeName: string;
    isBulk: boolean;
    challengeNames?: string;
    count?: number;
  }>({
    isOpen: false,
    challengeId: null,
    challengeName: "",
    isBulk: false,
  });

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

  // Direction tracking for challenge detail view
  const [detailDirection, setDetailDirection] = useState<
    "forward" | "backward" | null
  >(null);
  const [selectedLists, setSelectedLists] = useState<{
    todo: boolean;
    daily: boolean;
  }>({ todo: false, daily: false });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChallengeIds, setSelectedChallengeIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingChallenges, setDeletingChallenges] = useState(false);
  const [bulkListSelectionModalOpen, setBulkListSelectionModalOpen] =
    useState(false);
  const [bulkSelectedLists, setBulkSelectedLists] = useState({
    todo: false,
    daily: false,
  });
  const [addingBulkToList, setAddingBulkToList] = useState(false);

  // Swipe gesture state for challenge navigation (detail view)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(
    null
  );

  // Swipe gesture state for challenge list items
  const [itemSwipeStart, setItemSwipeStart] = useState<{
    x: number;
    y: number;
    challengeId: string;
  } | null>(null);
  const [itemSwipeEnd, setItemSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [swipedChallengeId, setSwipedChallengeId] = useState<string | null>(
    null
  );
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Long press state
  const longPressTimerRef = useRef<number | null>(null);
  const longPressChallengeIdRef = useRef<string | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  // Touch drag state for reordering
  const [touchDragStart, setTouchDragStart] = useState<{
    x: number;
    y: number;
    challengeId: string;
    initialIndex: number;
  } | null>(null);
  const [touchDragCurrent, setTouchDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [touchDragOffset, setTouchDragOffset] = useState<number>(0);
  const touchDragTimerRef = useRef<number | null>(null);

  const loadSkill = async () => {
    try {
      setLoading(true);
      const data = await skillAPI.getById(skillId);

      // Apply saved order from localStorage if challenges exist
      if (data.challenges && data.challenges.length > 0) {
        const savedOrder = localStorage.getItem(`challengeOrder-${skillId}`);
        if (savedOrder) {
          try {
            const orderArray: string[] = JSON.parse(savedOrder);
            const orderedChallenges = orderArray
              .map((id) =>
                data.challenges?.find((c: Challenge) => c._id === id)
              )
              .filter((c): c is Challenge => c !== undefined);

            // Add any new challenges that aren't in the saved order
            const existingIds = new Set(orderArray);
            const newChallenges = data.challenges.filter(
              (c: Challenge) => !existingIds.has(c._id)
            );

            data.challenges = [...orderedChallenges, ...newChallenges];
          } catch {
            // Use default order if parsing fails
          }
        }
      }

      setSkill(data);
    } catch (err) {
      console.error("Failed to load skill:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkill();
  }, [skillId]);

  // Sync todo list state from localStorage
  useEffect(() => {
    const items = getTodoItems();
    const activeTodoIds = new Set(
      items.filter((item) => !item.completed).map((item) => item.challengeId)
    );
    setTodoChallengeIds(activeTodoIds);
  }, [skillId, selectedChallengeId]);

  // Sync daily list state from localStorage
  useEffect(() => {
    const items = getDailyItems();
    const dailyIds = new Set(items.map((item) => item.challengeId));
    setDailyChallengeIds(dailyIds);
  }, [skillId, selectedChallengeId]);

  useEffect(() => {
    // Set initial challenge if provided
    if (initialChallengeId && skill?.challenges) {
      const challengeExists = skill.challenges.some(
        (c) => c._id === initialChallengeId
      );
      if (challengeExists && selectedChallengeId !== initialChallengeId) {
        // Opening from navigation (e.g., search) = forward direction
        setDetailDirection("forward");
        setSelectedChallengeId(initialChallengeId);
      }
    }
  }, [initialChallengeId, skill, selectedChallengeId]);

  // Removed auto-select - user must click to view challenge details

  // Cleanup long press and drag timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (touchDragTimerRef.current) {
        clearTimeout(touchDragTimerRef.current);
      }
    };
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

  // Clear detail direction after animation completes
  useEffect(() => {
    if (detailDirection) {
      const timer = setTimeout(() => {
        setDetailDirection(null);
      }, 350); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [detailDirection]);

  // Reset detail direction when detail view is closed
  useEffect(() => {
    if (!selectedChallengeId) {
      setDetailDirection(null);
    }
  }, [selectedChallengeId]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on the modal itself
      if (!target.closest(".challenge-action-modal")) {
        setActionModalChallengeId(null);
      }
      // Close list selection modals if clicking outside
      if (!target.closest(".list-selection-modal")) {
        if (listSelectionModalOpen) {
          setListSelectionModalOpen(false);
        }
        if (bulkListSelectionModalOpen) {
          setBulkListSelectionModalOpen(false);
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (actionModalChallengeId) {
          setActionModalChallengeId(null);
        }
        if (listSelectionModalOpen) {
          handleCloseListSelection();
        }
        if (bulkListSelectionModalOpen) {
          handleCloseBulkListSelection();
        }
      }
    };

    if (actionModalChallengeId || listSelectionModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [actionModalChallengeId, listSelectionModalOpen]);

  const handleOpenListSelection = () => {
    if (!selectedChallenge || !skill) return;

    const category = typeof skill.category === "object" ? skill.category : null;
    if (!category) return;

    // Pre-select lists that the challenge is already in
    setSelectedLists({
      todo: todoChallengeIds.has(selectedChallenge._id),
      daily: dailyChallengeIds.has(selectedChallenge._id),
    });
    setListSelectionModalOpen(true);
    hapticFeedback.light();
  };

  const handleCloseListSelection = () => {
    setListSelectionModalOpen(false);
    setSelectedLists({ todo: false, daily: false });
  };

  const handleConfirmListSelection = () => {
    if (!selectedChallenge || !skill) return;

    const category = typeof skill.category === "object" ? skill.category : null;
    if (!category) return;

    hapticFeedback.medium();

    // Handle To-Do list
    if (selectedLists.todo) {
      if (!todoChallengeIds.has(selectedChallenge._id)) {
        addTodoItem({
          challengeId: selectedChallenge._id,
          challengeName: selectedChallenge.name,
          skillId: skill._id,
          skillName: skill.name,
          categoryId: category._id,
          categoryName: category.name,
        });
        setTodoChallengeIds((prev) => {
          const next = new Set(prev);
          next.add(selectedChallenge._id);
          return next;
        });
      }
    } else {
      if (todoChallengeIds.has(selectedChallenge._id)) {
        removeTodoItem(selectedChallenge._id);
        setTodoChallengeIds((prev) => {
          const next = new Set(prev);
          next.delete(selectedChallenge._id);
          return next;
        });
      }
    }

    // Handle Daily list
    if (selectedLists.daily) {
      if (!dailyChallengeIds.has(selectedChallenge._id)) {
        addDailyItem({
          challengeId: selectedChallenge._id,
          challengeName: selectedChallenge.name,
          skillId: skill._id,
          skillName: skill.name,
          categoryId: category._id,
          categoryName: category.name,
        });
        setDailyChallengeIds((prev) => {
          const next = new Set(prev);
          next.add(selectedChallenge._id);
          return next;
        });
      }
    } else {
      if (dailyChallengeIds.has(selectedChallenge._id)) {
        const dailyItems = getDailyItems();
        const item = dailyItems.find(
          (i) => i.challengeId === selectedChallenge._id
        );
        if (item && !item.completed) {
          removeDailyItem(selectedChallenge._id);
          setDailyChallengeIds((prev) => {
            const next = new Set(prev);
            next.delete(selectedChallenge._id);
            return next;
          });
        }
      }
    }

    hapticFeedback.success();
    handleCloseListSelection();
  };

  const handleDeleteSelectedChallenges = () => {
    if (selectedChallengeIds.size === 0) return;

    const selectedChallenges =
      skill?.challenges?.filter((challenge) =>
        selectedChallengeIds.has(challenge._id)
      ) || [];
    const challengeNames = selectedChallenges
      .map((challenge) => challenge.name)
      .join(", ");

    setDeleteConfirmation({
      isOpen: true,
      challengeId: null,
      challengeName: "",
      isBulk: true,
      challengeNames,
      count: selectedChallengeIds.size,
    });
  };

  // Notify parent when footer state changes
  useEffect(() => {
    if (onFooterStateChange) {
      const selectedChallenge =
        skill?.challenges?.find((c) => c._id === selectedChallengeId) || null;
      onFooterStateChange({
        showAddForm,
        selectionMode,
        selectedIds: selectedChallengeIds,
        deleting: deletingChallenges,
        selectedChallengeId,
        selectedChallenge: selectedChallenge
          ? {
              id: selectedChallenge._id,
              name: selectedChallenge.name,
              inTodo: todoChallengeIds.has(selectedChallenge._id),
              inDaily: dailyChallengeIds.has(selectedChallenge._id),
              isDeleting: deletingChallenge === selectedChallenge._id,
              isUpdating: updatingChallenge === selectedChallenge._id,
              isCompleting: completingChallenge === selectedChallenge._id,
            }
          : null,
      });
    }
  }, [
    showAddForm,
    selectionMode,
    selectedChallengeIds,
    deletingChallenges,
    selectedChallengeId,
    skill,
    todoChallengeIds,
    dailyChallengeIds,
    deletingChallenge,
    updatingChallenge,
    completingChallenge,
    onFooterStateChange,
  ]);

  // Expose actions to parent via window object (for App.tsx footer)
  useEffect(() => {
    const selectedChallenge =
      skill?.challenges?.find((c) => c._id === selectedChallengeId) || null;

    // Store handlers in a way parent can call them
    const actionHandlers: Record<string, (e?: React.MouseEvent) => void> = {
      toggleAdd: () => setShowAddForm(!showAddForm),
      toggleSelect: () => setSelectionMode(true),
      deleteSelected: handleDeleteSelectedChallenges,
      openBulkList: handleOpenBulkListSelection,
      exitSelect: () => {
        setSelectionMode(false);
        setSelectedChallengeIds(new Set());
      },
      // Detail actions
      editChallenge: (e?: React.MouseEvent) => {
        if (selectedChallenge) {
          handleEditChallenge(selectedChallenge, e);
        }
      },
      deleteChallenge: (e?: React.MouseEvent) => {
        if (selectedChallenge) {
          handleDeleteChallenge(
            selectedChallenge._id,
            selectedChallenge.name,
            e || ({} as React.MouseEvent)
          );
        }
      },
      openListSelection: () => {
        handleOpenListSelection();
      },
      completeChallenge: (e?: React.MouseEvent) => {
        if (selectedChallenge) {
          handleCompleteChallenge(
            selectedChallenge,
            e || ({} as React.MouseEvent)
          );
        }
      },
    };
    // Store in a way parent can access
    (window as any).__challengeFooterActions = actionHandlers;
    return () => {
      delete (window as any).__challengeFooterActions;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showAddForm,
    selectionMode,
    selectedChallengeIds,
    selectedChallengeId,
    skill,
    // Handlers are stable, but we include them for completeness
  ]);

  const handleConfirmBulkDelete = async () => {
    if (selectedChallengeIds.size === 0) return;

    setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
    setDeletingChallenges(true);
    hapticFeedback.medium();

    try {
      // Delete all selected challenges
      await Promise.all(
        Array.from(selectedChallengeIds).map((id) => challengeAPI.delete(id))
      );

      // Clear selection and exit selection mode
      setSelectedChallengeIds(new Set());
      setSelectionMode(false);
      await loadSkill();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error
          ? err.message
          : "Failed to delete one or more challenges"
      );
    } finally {
      setDeletingChallenges(false);
    }
  };

  const handleOpenBulkListSelection = () => {
    if (selectedChallengeIds.size === 0) return;
    setBulkListSelectionModalOpen(true);
    hapticFeedback.light();
  };

  const handleCloseBulkListSelection = () => {
    setBulkListSelectionModalOpen(false);
    setBulkSelectedLists({ todo: false, daily: false });
  };

  const handleConfirmBulkListSelection = () => {
    if (selectedChallengeIds.size === 0 || !skill) return;

    const selectedChallenges =
      skill.challenges?.filter((challenge) =>
        selectedChallengeIds.has(challenge._id)
      ) || [];
    const category = typeof skill.category === "object" ? skill.category : null;
    if (!category) return;

    setAddingBulkToList(true);
    hapticFeedback.medium();

    try {
      // Add challenges to selected lists
      if (bulkSelectedLists.todo) {
        selectedChallenges.forEach((challenge) => {
          if (!todoChallengeIds.has(challenge._id)) {
            addTodoItem({
              challengeId: challenge._id,
              challengeName: challenge.name,
              skillId: skill._id,
              skillName: skill.name,
              categoryId: category._id,
              categoryName: category.name,
            });
            setTodoChallengeIds((prev) => {
              const next = new Set(prev);
              next.add(challenge._id);
              return next;
            });
          }
        });
      }

      if (bulkSelectedLists.daily) {
        selectedChallenges.forEach((challenge) => {
          if (!dailyChallengeIds.has(challenge._id)) {
            addDailyItem({
              challengeId: challenge._id,
              challengeName: challenge.name,
              skillId: skill._id,
              skillName: skill.name,
              categoryId: category._id,
              categoryName: category.name,
            });
            setDailyChallengeIds((prev) => {
              const next = new Set(prev);
              next.add(challenge._id);
              return next;
            });
          }
        });
      }

      hapticFeedback.success();
      toast.showSuccess(
        `Added ${selectedChallengeIds.size} challenge${
          selectedChallengeIds.size === 1 ? "" : "s"
        } to the selected list${
          bulkSelectedLists.todo && bulkSelectedLists.daily ? "s" : ""
        }.`
      );
      handleCloseBulkListSelection();
      setSelectedChallengeIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to add challenges to list"
      );
    } finally {
      setAddingBulkToList(false);
    }
  };

  const saveChallengeOrder = (newOrder: Challenge[]) => {
    const orderIds = newOrder.map((challenge) => challenge._id);
    localStorage.setItem(`challengeOrder-${skillId}`, JSON.stringify(orderIds));
  };

  const handleDragStart = (challengeId: string) => {
    setDraggedChallengeId(challengeId);
  };

  const handleDragOver = (e: React.DragEvent, challengeId: string) => {
    e.preventDefault();
    if (draggedChallengeId && draggedChallengeId !== challengeId) {
      setDragOverChallengeId(challengeId);
    }
  };

  const handleDragLeave = () => {
    setDragOverChallengeId(null);
  };

  const handleDrop = (e: React.DragEvent, targetChallengeId: string) => {
    e.preventDefault();
    if (
      !draggedChallengeId ||
      draggedChallengeId === targetChallengeId ||
      !skill?.challenges
    ) {
      setDraggedChallengeId(null);
      setDragOverChallengeId(null);
      return;
    }

    const draggedIndex = skill.challenges.findIndex(
      (c) => c._id === draggedChallengeId
    );
    const targetIndex = skill.challenges.findIndex(
      (c) => c._id === targetChallengeId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newChallenges = [...skill.challenges];
    const [draggedItem] = newChallenges.splice(draggedIndex, 1);
    newChallenges.splice(targetIndex, 0, draggedItem);

    setSkill({ ...skill, challenges: newChallenges });
    saveChallengeOrder(newChallenges);
    setDraggedChallengeId(null);
    setDragOverChallengeId(null);
  };

  const handleDragEnd = () => {
    setDraggedChallengeId(null);
    setDragOverChallengeId(null);
  };

  // Touch-based drag handlers for mobile
  const handleTouchDragStart = (challengeId: string, initialIndex: number) => {
    // Start timer for drag activation (long press)
    touchDragTimerRef.current = window.setTimeout(() => {
      setTouchDragStart({
        x: 0,
        y: 0,
        challengeId,
        initialIndex,
      });
      hapticFeedback.medium();
    }, 300); // 300ms long press to start drag
  };

  const handleTouchDragMove = (e: React.TouchEvent, challengeId: string) => {
    if (!touchDragStart || touchDragStart.challengeId !== challengeId) {
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
          (skill?.challenges?.length || 0) - 1,
          touchDragStart.initialIndex + itemsAbove
        )
      );

      if (newIndex !== touchDragStart.initialIndex && skill?.challenges) {
        const newChallenges = [...skill.challenges];
        const [draggedItem] = newChallenges.splice(
          touchDragStart.initialIndex,
          1
        );
        newChallenges.splice(newIndex, 0, draggedItem);
        setSkill({ ...skill, challenges: newChallenges });
        saveChallengeOrder(newChallenges);
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

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengeName.trim() || creatingChallenge) return;

    hapticFeedback.medium();
    setCreatingChallenge(true);
    try {
      await challengeAPI.create({
        name: newChallengeName.trim(),
        description: newChallengeDescription.trim() || undefined,
        skill: skillId,
        xpReward: newChallengeXPReward,
      });
      setNewChallengeName("");
      setNewChallengeDescription("");
      setNewChallengeXPReward(5);
      setShowAddForm(false);
      await loadSkill();
      setSelectedChallengeId(null); // Stay on list view
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to create challenge"
      );
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleCompleteChallenge = async (
    challenge: Challenge,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (completingChallenge === challenge._id) return;

    hapticFeedback.medium();
    setCompletingChallenge(challenge._id);
    try {
      await achievementAPI.create({ challenge: challenge._id });
      hapticFeedback.success();
      setCompletedChallengeId(challenge._id);
      const updatedSkill = await skillAPI.getById(skillId); // Reload to refresh skill data and update XP/level
      setSkill(updatedSkill);
      // Auto-select next challenge or first if none selected
      if (updatedSkill?.challenges && updatedSkill.challenges.length > 1) {
        const currentIndex = updatedSkill.challenges.findIndex(
          (c: Challenge) => c._id === challenge._id
        );
        const nextIndex = (currentIndex + 1) % updatedSkill.challenges.length;
        // Auto-selecting next = forward direction
        setDetailDirection("forward");
        setSelectedChallengeId(updatedSkill.challenges[nextIndex]._id);
      }

      // Auto-close modal after 3 seconds
      setTimeout(() => {
        setCompletedChallengeId(null);
      }, 3000);
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to complete challenge"
      );
    } finally {
      setCompletingChallenge(null);
    }
  };

  const handleEditChallenge = (challenge: Challenge, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    hapticFeedback.light();
    setEditingChallengeId(challenge._id);
    setEditChallengeName(challenge.name);
    setEditChallengeDescription(challenge.description || "");
    setEditChallengeXPReward(challenge.xpReward);
  };

  const handleLongPressStart = (challenge: Challenge) => {
    longPressTriggeredRef.current = false;
    longPressChallengeIdRef.current = challenge._id;
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressChallengeIdRef.current === challenge._id) {
        longPressTriggeredRef.current = true;
        hapticFeedback.medium();
        // Show action modal
        setActionModalChallengeId(challenge._id);
      }
    }, 500); // 500ms long press
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
    longPressChallengeIdRef.current = null;
  };

  const handleUpdateChallenge = async (
    challengeId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editChallengeName.trim() || updatingChallenge === challengeId) return;

    hapticFeedback.medium();
    setUpdatingChallenge(challengeId);
    try {
      await challengeAPI.update(challengeId, {
        name: editChallengeName.trim(),
        description: editChallengeDescription.trim() || undefined,
        xpReward: editChallengeXPReward,
      });
      setEditingChallengeId(null);
      await loadSkill();
      setSelectedChallengeId(null); // Return to list view
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to update challenge"
      );
    } finally {
      setUpdatingChallenge(null);
    }
  };

  const handleDeleteChallenge = (
    challengeId: string,
    challengeName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingChallenge === challengeId) return;

    hapticFeedback.medium();
    setDeleteConfirmation({
      isOpen: true,
      challengeId,
      challengeName,
      isBulk: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.challengeId || deleteConfirmation.isBulk) return;

    const challengeId = deleteConfirmation.challengeId;
    setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
    setDeletingChallenge(challengeId);
    try {
      await challengeAPI.delete(challengeId);
      const updatedSkill = await skillAPI.getById(skillId);
      setSkill(updatedSkill);
      hapticFeedback.success();
      // Auto-select first challenge if available
      if (updatedSkill?.challenges && updatedSkill.challenges.length > 0) {
        // Auto-selecting after delete = forward direction
        setDetailDirection("forward");
        setSelectedChallengeId(updatedSkill.challenges[0]._id);
      } else {
        setSelectedChallengeId(null);
      }
    } catch (err) {
      hapticFeedback.error();
      toast.showError(
        err instanceof Error ? err.message : "Failed to delete challenge"
      );
    } finally {
      setDeletingChallenge(null);
    }
  };

  const selectedChallenge =
    skill?.challenges?.find((c) => c._id === selectedChallengeId) || null;

  // Navigation functions for challenge arrows
  const navigateToPreviousChallenge = () => {
    if (!skill?.challenges || !selectedChallengeId) return;
    const currentIndex = skill.challenges.findIndex(
      (c) => c._id === selectedChallengeId
    );
    if (currentIndex > 0) {
      hapticFeedback.navigation();
      setDetailDirection("backward"); // Going to previous = backward
      setSelectedChallengeId(skill.challenges[currentIndex - 1]._id);
    }
  };

  const navigateToNextChallenge = () => {
    if (!skill?.challenges || !selectedChallengeId) return;
    const currentIndex = skill.challenges.findIndex(
      (c) => c._id === selectedChallengeId
    );
    if (currentIndex < skill.challenges.length - 1) {
      hapticFeedback.navigation();
      setDetailDirection("forward"); // Going to next = forward
      setSelectedChallengeId(skill.challenges[currentIndex + 1]._id);
    }
  };

  const canNavigatePrevious =
    skill?.challenges &&
    selectedChallengeId &&
    skill.challenges.findIndex((c) => c._id === selectedChallengeId) > 0;

  const canNavigateNext =
    skill?.challenges &&
    selectedChallengeId &&
    skill.challenges.findIndex((c) => c._id === selectedChallengeId) <
      skill.challenges.length - 1;

  // Swipe gesture handlers for challenge navigation
  const minSwipeDistance = 50; // Minimum distance in pixels to trigger swipe

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    // Cancel any long press timer when starting a swipe
    handleLongPressEnd();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    // Cancel long press if user moves finger
    if (touchStart) {
      const distanceX = Math.abs(touchStart.x - e.targetTouches[0].clientX);
      const distanceY = Math.abs(touchStart.y - e.targetTouches[0].clientY);
      if (distanceX > 10 || distanceY > 10) {
        handleLongPressEnd();
      }
    }
  };

  const onTouchEnd = () => {
    handleLongPressEnd(); // Always cancel long press on touch end

    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (isVerticalSwipe) {
      return;
    }

    if (isLeftSwipe && canNavigateNext) {
      // Swipe left = forward (next challenge)
      setDetailDirection("forward");
      navigateToNextChallenge();
    }
    if (isRightSwipe && canNavigatePrevious) {
      // Swipe right = backward (previous challenge)
      setDetailDirection("backward");
      navigateToPreviousChallenge();
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

  if (loading) {
    return (
      <div className={`challenges-container ${animationClass}`}>
        <div className="challenges-list">
          <BreadcrumbsSkeleton />
          <div className="section-header">
            <Skeleton width="200px" height="2rem" />
          </div>
          <ul className="challenge-list">
            <ChallengeSkeletonList count={4} />
          </ul>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className={`challenges-container ${animationClass}`}>
        <div className="empty-state">Skill not found</div>
      </div>
    );
  }

  // Get category from skill for breadcrumbs
  const category =
    skill && typeof skill.category === "object" ? skill.category : null;
  const skillForBreadcrumb =
    skill && typeof skill.category === "object" ? skill : null;

  return (
    <div
      className={`challenges-container ${
        selectedChallengeId ? "detail-view" : "list-view"
      } ${animationClass}`}
    >
        <div className="challenges-list">
          <Breadcrumbs
            category={category}
            skill={skillForBreadcrumb}
            onCategoriesClick={onBackToCategories}
            onCategoryClick={onBackToCategory}
            onSkillClick={undefined}
          />
          <div className="section-header">
            <h2>{skill.name}</h2>
          </div>

          {skill.description && (
            <p className="skill-description">{skill.description}</p>
          )}

          {skill.challenges && skill.challenges.length === 0 ? (
            <EmptyState
              icon="⚡"
              title="No Challenges Yet"
              message="Challenges are the building blocks of your skills. Create your first challenge to start earning XP and leveling up!"
              actionLabel="Add Challenge"
              onAction={() => setShowAddForm(true)}
            />
          ) : (
            <ul className="challenge-list">
              {skill.challenges?.map((challenge) => (
                <li
                  key={challenge._id}
                  className={`challenge-item ${
                    selectedChallengeId === challenge._id ? "selected" : ""
                  } ${
                    selectionMode && selectedChallengeIds.has(challenge._id)
                      ? "selected"
                      : ""
                  } ${draggedChallengeId === challenge._id ? "dragging" : ""} ${
                    dragOverChallengeId === challenge._id ? "drag-over" : ""
                  } ${swipedChallengeId === challenge._id ? "swiping" : ""} ${
                    touchDragStart?.challengeId === challenge._id
                      ? "touch-dragging"
                      : ""
                  }`}
                  draggable={
                    !selectionMode && editingChallengeId !== challenge._id
                  }
                  onDragStart={() => handleDragStart(challenge._id)}
                  onDragOver={(e) => handleDragOver(e, challenge._id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, challenge._id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    // Don't trigger click if long press was just triggered or if swiping
                    if (
                      longPressTriggeredRef.current ||
                      swipedChallengeId === challenge._id
                    ) {
                      return;
                    }

                    if (selectionMode) {
                      setSelectedChallengeIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(challenge._id)) {
                          next.delete(challenge._id);
                        } else {
                          next.add(challenge._id);
                        }
                        return next;
                      });
                    } else if (editingChallengeId !== challenge._id) {
                      hapticFeedback.selection();
                      // Opening from list = forward direction
                      setDetailDirection("forward");
                      setSelectedChallengeId(challenge._id);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (
                      e.button === 0 &&
                      editingChallengeId !== challenge._id
                    ) {
                      handleLongPressStart(challenge);
                    }
                  }}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={(e) => {
                    if (editingChallengeId !== challenge._id) {
                      const touch = e.touches[0];
                      const initialIndex =
                        skill?.challenges?.findIndex(
                          (c) => c._id === challenge._id
                        ) ?? -1;

                      // Start long press timer for action modal
                      handleLongPressStart(challenge);
                      // Start touch drag timer for reordering
                      if (initialIndex >= 0 && !selectionMode) {
                        handleTouchDragStart(challenge._id, initialIndex);
                      }
                      // Also track for swipe
                      setItemSwipeStart({
                        x: touch.clientX,
                        y: touch.clientY,
                        challengeId: challenge._id,
                      });
                      setItemSwipeEnd(null);
                      setSwipeOffset(0);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (
                      itemSwipeStart &&
                      itemSwipeStart.challengeId === challenge._id
                    ) {
                      const currentX = e.touches[0].clientX;
                      const currentY = e.touches[0].clientY;
                      setItemSwipeEnd({ x: currentX, y: currentY });

                      // Calculate swipe offset for visual feedback
                      const deltaX = currentX - itemSwipeStart.x;
                      const deltaY = Math.abs(currentY - itemSwipeStart.y);

                      // If touch drag is active, handle vertical drag
                      if (touchDragStart?.challengeId === challenge._id) {
                        handleTouchDragMove(e, challenge._id);
                        // Cancel swipe and long press when dragging
                        handleLongPressEnd();
                        setItemSwipeStart(null);
                        return;
                      }

                      // Only allow horizontal swipes (ignore if vertical movement is too large)
                      if (deltaY < 30) {
                        setSwipeOffset(deltaX);
                        setSwipedChallengeId(challenge._id);
                        // Cancel long press and drag if swiping horizontally
                        if (Math.abs(deltaX) > 10) {
                          handleLongPressEnd();
                          handleTouchDragEnd();
                        }
                      } else if (deltaY > 30) {
                        // Cancel horizontal swipe if vertical movement is too large
                        setItemSwipeStart(null);
                        setSwipedChallengeId(null);
                        setSwipeOffset(0);
                      }
                    }
                  }}
                  onTouchEnd={() => {
                    handleLongPressEnd();
                    handleTouchDragEnd();

                    if (
                      itemSwipeStart &&
                      itemSwipeStart.challengeId === challenge._id &&
                      itemSwipeEnd &&
                      !touchDragStart
                    ) {
                      const deltaX = itemSwipeEnd.x - itemSwipeStart.x;
                      const deltaY = Math.abs(
                        itemSwipeEnd.y - itemSwipeStart.y
                      );
                      const minSwipeDistance = 80;

                      // Only handle horizontal swipes
                      if (deltaY < 50 && Math.abs(deltaX) > minSwipeDistance) {
                        if (deltaX > 0) {
                          // Swipe right - complete
                          hapticFeedback.success();
                          handleCompleteChallenge(challenge, {
                            stopPropagation: () => {},
                          } as React.MouseEvent);
                        } else {
                          // Swipe left - delete
                          hapticFeedback.medium();
                          handleDeleteChallenge(challenge._id, challenge.name, {
                            stopPropagation: () => {},
                          } as React.MouseEvent);
                        }
                      }
                    }

                    // Reset swipe state
                    setItemSwipeStart(null);
                    setItemSwipeEnd(null);
                    setSwipedChallengeId(null);
                    setSwipeOffset(0);
                  }}
                  onTouchCancel={() => {
                    handleLongPressEnd();
                    handleTouchDragEnd();
                    setItemSwipeStart(null);
                    setItemSwipeEnd(null);
                    setSwipedChallengeId(null);
                    setSwipeOffset(0);
                  }}
                  style={{
                    transform:
                      touchDragStart?.challengeId === challenge._id
                        ? `translateY(${touchDragOffset}px)`
                        : swipedChallengeId === challenge._id
                        ? `translateX(${Math.max(
                            -100,
                            Math.min(100, swipeOffset)
                          )}px)`
                        : undefined,
                    transition:
                      touchDragStart?.challengeId === challenge._id ||
                      swipedChallengeId === challenge._id
                        ? "none"
                        : "transform 0.2s ease-out",
                    zIndex:
                      touchDragStart?.challengeId === challenge._id
                        ? 1000
                        : undefined,
                    opacity:
                      touchDragStart?.challengeId === challenge._id
                        ? 0.8
                        : undefined,
                  }}
                >
                  <>
                    <div className="challenge-info">
                      <div className="challenge-name">{challenge.name}</div>
                      {/* Swipe action indicators */}
                      {swipedChallengeId === challenge._id && (
                        <>
                          {swipeOffset > 0 && (
                            <div className="challenge-swipe-indicator swipe-complete">
                              <span className="swipe-icon">✓</span>
                              <span className="swipe-text">Complete</span>
                            </div>
                          )}
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
        </div>

        {selectedChallenge && (
          <div
            className={`challenge-detail ${
              detailDirection === "forward"
                ? "slide-in-right"
                : detailDirection === "backward"
                ? "slide-in-left"
                : ""
            }`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={(e) => {
              if (e.button === 0 && !editingChallengeId) {
                handleLongPressStart(selectedChallenge);
              }
            }}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
          >
            <Breadcrumbs
              category={category}
              skill={skillForBreadcrumb}
              challenge={selectedChallenge}
              onCategoriesClick={onBackToCategories}
              onCategoryClick={onBackToCategory}
              onSkillClick={() => setSelectedChallengeId(null)}
              onChallengeClick={undefined}
            />
            <div className="challenge-detail-header">
              <button
                className="challenge-nav-arrow challenge-nav-arrow-left"
                onClick={navigateToPreviousChallenge}
                disabled={!canNavigatePrevious}
                title="Previous challenge"
                aria-label="Previous challenge"
              >
                ‹
              </button>
              <h2 className="challenge-detail-title">
                {selectedChallenge.name}
              </h2>
              <button
                className="challenge-nav-arrow challenge-nav-arrow-right"
                onClick={navigateToNextChallenge}
                disabled={!canNavigateNext}
                title="Next challenge"
                aria-label="Next challenge"
              >
                ›
              </button>
            </div>
            <div className="challenge-detail-description-container">
              <div className="challenge-detail-description-readonly">
                {selectedChallenge.description ? (
                  <p className="challenge-detail-description">
                    {linkifyText(selectedChallenge.description)}
                  </p>
                ) : (
                  <p className="challenge-detail-description no-description">
                    No description provided.
                  </p>
                )}
              </div>
            </div>
            {/* Actions are now rendered in App.tsx footer */}
          </div>
        )}

        {/* Action Modal */}
        {actionModalChallengeId && (
          <div className="challenge-action-modal-overlay">
            <div className="challenge-action-modal">
              {(() => {
                const challenge =
                  skill?.challenges?.find(
                    (c) => c._id === actionModalChallengeId
                  ) ||
                  (selectedChallenge?._id === actionModalChallengeId
                    ? selectedChallenge
                    : null);
                if (!challenge) return null;

                return (
                  <>
                    <div className="challenge-action-modal-header">
                      <h3>{challenge.name}</h3>
                      <button
                        className="challenge-action-modal-close"
                        onClick={() => setActionModalChallengeId(null)}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                    <div className="challenge-action-modal-actions">
                      <button
                        className="challenge-action-button complete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteChallenge(challenge, e);
                          setActionModalChallengeId(null);
                        }}
                        disabled={
                          completingChallenge === challenge._id ||
                          deletingChallenge === challenge._id ||
                          updatingChallenge === challenge._id
                        }
                      >
                        {completingChallenge === challenge._id ? (
                          <>
                            <Spinner size="sm" />
                            <span>Completing...</span>
                          </>
                        ) : (
                          <>
                            <span className="button-icon">✓</span>
                            <span>Complete</span>
                          </>
                        )}
                      </button>
                      <button
                        className="challenge-action-button edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionModalChallengeId(null);
                          // Small delay to ensure action modal closes before edit modal opens
                          setTimeout(() => {
                            handleEditChallenge(challenge, e);
                          }, 100);
                        }}
                        disabled={
                          deletingChallenge === challenge._id ||
                          updatingChallenge === challenge._id ||
                          completingChallenge === challenge._id
                        }
                      >
                        <span className="button-icon">✏️</span>
                        <span>Edit</span>
                      </button>
                      <button
                        className="challenge-action-button delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChallenge(
                            challenge._id,
                            challenge.name,
                            e
                          );
                          setActionModalChallengeId(null);
                        }}
                        disabled={
                          deletingChallenge === challenge._id ||
                          updatingChallenge === challenge._id ||
                          completingChallenge === challenge._id
                        }
                      >
                        {deletingChallenge === challenge._id ? (
                          <>
                            <Spinner size="sm" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <span className="button-icon">🗑️</span>
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* List Selection Modal */}
        {listSelectionModalOpen && selectedChallenge && (
          <div className="list-selection-modal-overlay">
            <div className="list-selection-modal">
              <div className="list-selection-modal-header">
                <h3>Add to Lists</h3>
                <button
                  className="list-selection-modal-close"
                  onClick={handleCloseListSelection}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="list-selection-modal-content">
                <p className="list-selection-modal-description">
                  Select which lists to add "{selectedChallenge.name}" to:
                </p>
                <div className="list-selection-options">
                  <label className="list-selection-option">
                    <input
                      type="checkbox"
                      checked={selectedLists.todo}
                      onChange={(e) =>
                        setSelectedLists((prev) => ({
                          ...prev,
                          todo: e.target.checked,
                        }))
                      }
                    />
                    <div className="list-selection-option-content">
                      <span className="list-selection-option-icon">📝</span>
                      <div className="list-selection-option-text">
                        <span className="list-selection-option-name">
                          To-Do List
                        </span>
                        <span className="list-selection-option-description">
                          Tasks are removed when completed
                        </span>
                      </div>
                      {todoChallengeIds.has(selectedChallenge._id) && (
                        <span className="list-selection-option-status">
                          (Already added)
                        </span>
                      )}
                    </div>
                  </label>
                  <label className="list-selection-option">
                    <input
                      type="checkbox"
                      checked={selectedLists.daily}
                      onChange={(e) =>
                        setSelectedLists((prev) => ({
                          ...prev,
                          daily: e.target.checked,
                        }))
                      }
                    />
                    <div className="list-selection-option-content">
                      <span className="list-selection-option-icon">📅</span>
                      <div className="list-selection-option-text">
                        <span className="list-selection-option-name">
                          Daily List
                        </span>
                        <span className="list-selection-option-description">
                          Tasks persist after completion
                        </span>
                      </div>
                      {dailyChallengeIds.has(selectedChallenge._id) && (
                        <span className="list-selection-option-status">
                          (Already added)
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              </div>
              <div className="list-selection-modal-actions">
                <button
                  className="list-selection-button cancel"
                  onClick={handleCloseListSelection}
                >
                  Cancel
                </button>
                <button
                  className="list-selection-button confirm"
                  onClick={handleConfirmListSelection}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer is rendered in App.tsx to avoid transform issues */}

        {bulkListSelectionModalOpen && (
          <div className="list-selection-modal-overlay">
            <div className="list-selection-modal">
              <div className="list-selection-modal-header">
                <h3>Add to Lists</h3>
                <button
                  className="list-selection-modal-close"
                  onClick={handleCloseBulkListSelection}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="list-selection-modal-content">
                <p className="list-selection-modal-description">
                  Select which lists to add {selectedChallengeIds.size}{" "}
                  challenge
                  {selectedChallengeIds.size === 1 ? "" : "s"} to:
                </p>
                <div className="list-selection-options">
                  <label className="list-selection-option">
                    <input
                      type="checkbox"
                      checked={bulkSelectedLists.todo}
                      onChange={(e) =>
                        setBulkSelectedLists((prev) => ({
                          ...prev,
                          todo: e.target.checked,
                        }))
                      }
                    />
                    <div className="list-selection-option-content">
                      <span className="list-selection-option-icon">📝</span>
                      <div className="list-selection-option-text">
                        <span className="list-selection-option-name">
                          To-Do List
                        </span>
                        <span className="list-selection-option-description">
                          Tasks are removed when completed
                        </span>
                      </div>
                    </div>
                  </label>
                  <label className="list-selection-option">
                    <input
                      type="checkbox"
                      checked={bulkSelectedLists.daily}
                      onChange={(e) =>
                        setBulkSelectedLists((prev) => ({
                          ...prev,
                          daily: e.target.checked,
                        }))
                      }
                    />
                    <div className="list-selection-option-content">
                      <span className="list-selection-option-icon">📅</span>
                      <div className="list-selection-option-text">
                        <span className="list-selection-option-name">
                          Daily List
                        </span>
                        <span className="list-selection-option-description">
                          Tasks persist after being checked off
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="list-selection-modal-actions">
                <button
                  className="list-selection-button cancel"
                  onClick={handleCloseBulkListSelection}
                  disabled={addingBulkToList}
                >
                  Cancel
                </button>
                <button
                  className="list-selection-button confirm"
                  onClick={handleConfirmBulkListSelection}
                  disabled={
                    addingBulkToList ||
                    (!bulkSelectedLists.todo && !bulkSelectedLists.daily)
                  }
                >
                  {addingBulkToList ? (
                    <>
                      <Spinner size="sm" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Challenge Modal */}
        {editingChallengeId && (
          <div
            className="challenge-edit-modal-overlay"
            onClick={() => {
              hapticFeedback.light();
              setEditingChallengeId(null);
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
                  setEditingChallengeId(null);
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
                const challenge =
                  skill?.challenges?.find(
                    (c) => c._id === editingChallengeId
                  ) ||
                  (selectedChallenge?._id === editingChallengeId
                    ? selectedChallenge
                    : null);
                if (!challenge) return null;

                return (
                  <>
                    <div className="challenge-action-modal-header">
                      <h3>Edit Challenge</h3>
                      <button
                        className="challenge-action-modal-close"
                        onClick={() => {
                          hapticFeedback.light();
                          setEditingChallengeId(null);
                        }}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                    <form
                      className="edit-form"
                      onSubmit={(e) => handleUpdateChallenge(challenge._id, e)}
                    >
                      <div className="auth-field">
                        <label htmlFor="edit-challenge-name">Name *</label>
                        <input
                          id="edit-challenge-name"
                          type="text"
                          value={editChallengeName}
                          onChange={(e) => setEditChallengeName(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="auth-field">
                        <label htmlFor="edit-challenge-description">
                          Description
                        </label>
                        <textarea
                          id="edit-challenge-description"
                          placeholder="Description (optional)"
                          value={editChallengeDescription}
                          onChange={(e) =>
                            setEditChallengeDescription(e.target.value)
                          }
                          rows={4}
                        />
                      </div>
                      <div className="auth-field">
                        <label htmlFor="edit-challenge-xp">XP Reward *</label>
                        <input
                          id="edit-challenge-xp"
                          type="number"
                          placeholder="XP Reward"
                          value={editChallengeXPReward}
                          onChange={(e) =>
                            setEditChallengeXPReward(
                              parseInt(e.target.value) || 5
                            )
                          }
                          min="1"
                          required
                        />
                      </div>
                      <div className="edit-form-actions">
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            hapticFeedback.light();
                            setEditingChallengeId(null);
                          }}
                          disabled={updatingChallenge === challenge._id}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="save-button"
                          disabled={updatingChallenge === challenge._id}
                        >
                          {updatingChallenge === challenge._id ? (
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

        {/* Add Challenge Modal */}
        {showAddForm && (
          <div
            className="challenge-edit-modal-overlay"
            onClick={() => {
              hapticFeedback.light();
              setShowAddForm(false);
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
                <h3>Add Challenge</h3>
                <button
                  className="challenge-action-modal-close"
                  onClick={() => {
                    hapticFeedback.light();
                    setShowAddForm(false);
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form className="edit-form" onSubmit={handleCreateChallenge}>
                <div className="auth-field">
                  <label htmlFor="new-challenge-name">Name *</label>
                  <input
                    id="new-challenge-name"
                    type="text"
                    placeholder="Challenge name"
                    value={newChallengeName}
                    onChange={(e) => setNewChallengeName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="new-challenge-description">Description</label>
                  <textarea
                    id="new-challenge-description"
                    placeholder="Description (optional)"
                    value={newChallengeDescription}
                    onChange={(e) => setNewChallengeDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="new-challenge-xp">XP Reward *</label>
                  <input
                    id="new-challenge-xp"
                    type="number"
                    placeholder="XP Reward"
                    value={newChallengeXPReward}
                    onChange={(e) =>
                      setNewChallengeXPReward(parseInt(e.target.value) || 5)
                    }
                    min="1"
                    required
                  />
                </div>
                <div className="edit-form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      hapticFeedback.light();
                      setShowAddForm(false);
                    }}
                    disabled={creatingChallenge}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-button"
                    disabled={creatingChallenge}
                  >
                    {creatingChallenge ? (
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

        {/* Challenge Completion Modal */}
        {completedChallengeId && (
          <div
            className="challenge-edit-modal-overlay"
            onClick={() => {
              hapticFeedback.light();
              setCompletedChallengeId(null);
            }}
          >
            <div
              className="challenge-completion-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const challenge =
                  skill?.challenges?.find(
                    (c) => c._id === completedChallengeId
                  ) ||
                  (selectedChallenge?._id === completedChallengeId
                    ? selectedChallenge
                    : null);
                if (!challenge) return null;

                return (
                  <>
                    <div className="challenge-completion-content">
                      <div className="challenge-completion-icon">🎉</div>
                      <h2 className="challenge-completion-title">
                        Challenge Completed!
                      </h2>
                      <p className="challenge-completion-name">
                        {challenge.name}
                      </p>
                      <div className="challenge-completion-xp">
                        +{challenge.xpReward} XP
                      </div>
                    </div>
                    <button
                      className="challenge-completion-close"
                      onClick={() => {
                        hapticFeedback.light();
                        setCompletedChallengeId(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
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
          onConfirm={
            deleteConfirmation.isBulk
              ? handleConfirmBulkDelete
              : handleConfirmDelete
          }
          title={
            deleteConfirmation.isBulk
              ? `Delete ${deleteConfirmation.count} Challenge${
                  deleteConfirmation.count === 1 ? "" : "s"
                }?`
              : `Delete Challenge?`
          }
          message={
            deleteConfirmation.isBulk
              ? `Are you sure you want to delete ${
                  deleteConfirmation.count
                } challenge${deleteConfirmation.count === 1 ? "" : "s"}?\n\n${
                  deleteConfirmation.challengeNames
                }`
              : `Are you sure you want to delete "${deleteConfirmation.challengeName}"?`
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          loading={
            deleteConfirmation.isBulk
              ? deletingChallenges
              : deletingChallenge === deleteConfirmation.challengeId
           }
         />
    </div>
  );
}
