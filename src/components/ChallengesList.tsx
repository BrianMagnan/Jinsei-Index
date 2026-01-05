import { useState, useEffect, useRef } from "react";
import { challengeAPI, achievementAPI, skillAPI } from "../services/api";
import type { SkillWithHierarchy, Challenge } from "../types";
import { Spinner } from "./Spinner";
import { Breadcrumbs } from "./Breadcrumbs";
import { ChallengeSkeletonList } from "./ChallengeSkeleton";
import { EmptyState } from "./EmptyState";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { hapticFeedback } from "../utils/haptic";
import { linkifyText } from "../utils/linkifyText";
import {
  addTodoItem,
  removeTodoItem,
  getTodoItems,
} from "../utils/todoStorage";

interface ChallengesListProps {
  skillId: string;
  onBackToCategory?: () => void;
  onBackToCategories?: () => void;
  initialChallengeId?: string;
}

export function ChallengesList({
  skillId,
  onBackToCategory,
  onBackToCategories,
  initialChallengeId,
}: ChallengesListProps) {
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [menuCloseTimeout, setMenuCloseTimeout] = useState<number | null>(null);
  const [challengeDescription, setChallengeDescription] = useState("");
  const [savingChallengeDescription, setSavingChallengeDescription] =
    useState(false);
  const [editingChallengeDescription, setEditingChallengeDescription] =
    useState(false);
  const [todoChallengeIds, setTodoChallengeIds] = useState<Set<string>>(
    new Set()
  );

  // Swipe gesture state for challenge navigation
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(
    null
  );

  // Ref for textarea to handle keyboard scrolling
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const { pullDistance, isPulling, containerProps } = usePullToRefresh({
    onRefresh: loadSkill,
    enabled: !loading && !creatingChallenge,
  });

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

  useEffect(() => {
    // Set initial challenge if provided
    if (initialChallengeId && skill?.challenges) {
      const challengeExists = skill.challenges.some(
        (c) => c._id === initialChallengeId
      );
      if (challengeExists && selectedChallengeId !== initialChallengeId) {
        setSelectedChallengeId(initialChallengeId);
      }
    }
  }, [initialChallengeId, skill, selectedChallengeId]);

  useEffect(() => {
    // Sync challenge description state when selected challenge changes
    if (selectedChallengeId && skill?.challenges) {
      const challenge = skill.challenges.find(
        (c) => c._id === selectedChallengeId
      );
      if (challenge) {
        setChallengeDescription(challenge.description || "");
        setEditingChallengeDescription(false); // Reset edit mode when challenge changes
      }
    }
  }, [selectedChallengeId, skill]);

  // Removed auto-select - user must click to view challenge details

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest(".challenge-menu-container")) {
        setOpenMenuId(null);
      }
      if (
        detailMenuOpen &&
        !target.closest(".challenge-detail-menu-container")
      ) {
        setDetailMenuOpen(false);
      }
    };

    if (openMenuId || detailMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId, detailMenuOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (menuCloseTimeout) {
        clearTimeout(menuCloseTimeout);
      }
    };
  }, [menuCloseTimeout]);

  const handleSaveChallengeDescription = async () => {
    if (
      !selectedChallengeId ||
      !skill?.challenges ||
      savingChallengeDescription
    )
      return;

    const challenge = skill.challenges.find(
      (c) => c._id === selectedChallengeId
    );
    if (!challenge) return;

    const trimmedDescription = challengeDescription.trim();
    // Only save if description actually changed
    if (trimmedDescription === (challenge.description || "")) {
      setEditingChallengeDescription(false);
      return;
    }

    hapticFeedback.medium();
    setSavingChallengeDescription(true);
    try {
      await challengeAPI.update(selectedChallengeId, {
        description: trimmedDescription || undefined,
      });
      // Update local skill state to reflect the change
      const updatedChallenges = skill.challenges.map((c) =>
        c._id === selectedChallengeId
          ? { ...c, description: trimmedDescription || undefined }
          : c
      );
      setSkill({ ...skill, challenges: updatedChallenges });
      setEditingChallengeDescription(false);
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to save description");
      // Revert to original description on error
      setChallengeDescription(challenge.description || "");
    } finally {
      setSavingChallengeDescription(false);
    }
  };

  const handleCancelEditDescription = () => {
    if (!selectedChallengeId || !skill?.challenges) return;
    const challenge = skill.challenges.find(
      (c) => c._id === selectedChallengeId
    );
    if (challenge) {
      setChallengeDescription(challenge.description || "");
    }
    setEditingChallengeDescription(false);
  };

  const handleEditDescription = () => {
    hapticFeedback.light();
    if (editingChallengeDescription) {
      // If already editing, cancel edit
      setEditingChallengeDescription(false);
      // Reset description to saved value
      if (selectedChallengeId && skill?.challenges) {
        const challenge = skill.challenges.find(
          (c) => c._id === selectedChallengeId
        );
        if (challenge) {
          setChallengeDescription(challenge.description || "");
        }
      }
    } else {
      // Start editing
      setEditingChallengeDescription(true);
    }
  };

  const handleToggleTodo = (challenge: Challenge) => {
    if (!skill) return;

    const category = typeof skill.category === "object" ? skill.category : null;
    if (!category) return;

    const inTodo = todoChallengeIds.has(challenge._id);

    if (inTodo) {
      hapticFeedback.light();
      removeTodoItem(challenge._id);
      // Update state immediately
      setTodoChallengeIds((prev) => {
        const next = new Set(prev);
        next.delete(challenge._id);
        return next;
      });
    } else {
      hapticFeedback.success();
      addTodoItem({
        challengeId: challenge._id,
        challengeName: challenge.name,
        skillId: skill._id,
        skillName: skill.name,
        categoryId: category._id,
        categoryName: category.name,
      });
      // Update state immediately
      setTodoChallengeIds((prev) => {
        const next = new Set(prev);
        next.add(challenge._id);
        return next;
      });
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
      hapticFeedback.success();
      // Auto-select the newly created challenge
      const updatedSkill = await skillAPI.getById(skillId);
      if (updatedSkill.challenges && updatedSkill.challenges.length > 0) {
        const newChallenge =
          updatedSkill.challenges[updatedSkill.challenges.length - 1];
        setSelectedChallengeId(newChallenge._id);
      }
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to create challenge");
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
      alert(
        `Challenge "${challenge.name}" completed! +${challenge.xpReward} XP`
      );
      await loadSkill(); // Reload to refresh skill data and update XP/level
      // Auto-select next challenge or first if none selected
      if (skill?.challenges && skill.challenges.length > 1) {
        const currentIndex = skill.challenges.findIndex(
          (c) => c._id === challenge._id
        );
        const nextIndex = (currentIndex + 1) % skill.challenges.length;
        setSelectedChallengeId(skill.challenges[nextIndex]._id);
      }
    } catch (err) {
      hapticFeedback.error();
      alert(
        err instanceof Error ? err.message : "Failed to complete challenge"
      );
    } finally {
      setCompletingChallenge(null);
    }
  };

  const handleEditChallenge = (challenge: Challenge, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.light();
    setEditingChallengeId(challenge._id);
    setEditChallengeName(challenge.name);
    setEditChallengeDescription(challenge.description || "");
    setEditChallengeXPReward(challenge.xpReward);
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
      setSelectedChallengeId(challengeId); // Keep same challenge selected
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to update challenge");
    } finally {
      setUpdatingChallenge(null);
    }
  };

  const handleDeleteChallenge = async (
    challengeId: string,
    challengeName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingChallenge === challengeId) return;

    hapticFeedback.medium();
    if (!confirm(`Are you sure you want to delete "${challengeName}"?`)) {
      return;
    }

    setDeletingChallenge(challengeId);
    try {
      await challengeAPI.delete(challengeId);
      await loadSkill();
      hapticFeedback.success();
      // Auto-select first challenge if available
      if (skill?.challenges && skill.challenges.length > 1) {
        const remainingChallenges = skill.challenges.filter(
          (c) => c._id !== challengeId
        );
        if (remainingChallenges.length > 0) {
          setSelectedChallengeId(remainingChallenges[0]._id);
        } else {
          setSelectedChallengeId(null);
        }
      } else {
        setSelectedChallengeId(null);
      }
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to delete challenge");
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
      setSelectedChallengeId(skill.challenges[currentIndex - 1]._id);
      setDetailMenuOpen(false);
    }
  };

  const navigateToNextChallenge = () => {
    if (!skill?.challenges || !selectedChallengeId) return;
    const currentIndex = skill.challenges.findIndex(
      (c) => c._id === selectedChallengeId
    );
    if (currentIndex < skill.challenges.length - 1) {
      hapticFeedback.navigation();
      setSelectedChallengeId(skill.challenges[currentIndex + 1]._id);
      setDetailMenuOpen(false);
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
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
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
      navigateToNextChallenge();
    }
    if (isRightSwipe && canNavigatePrevious) {
      navigateToPreviousChallenge();
    }
  };

  if (loading) {
    return (
      <div className="challenges-container">
        <div className="challenges-header">
          <h2>Challenges</h2>
        </div>
        <ul className="challenge-list">
          <ChallengeSkeletonList count={4} />
        </ul>
      </div>
    );
  }

  if (!skill) {
    return <div className="empty-state">Skill not found</div>;
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
      }`}
    >
      <div
        className="challenges-list"
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
        <Breadcrumbs
          category={category}
          skill={skillForBreadcrumb}
          onCategoriesClick={onBackToCategories}
          onCategoryClick={onBackToCategory}
          onSkillClick={undefined}
        />
        <div className="section-header challenges-header">
          <div className="header-title-section">
            <h2>{skill.name}</h2>
          </div>
          <button
            className="add-button"
            onClick={() => setShowAddForm(!showAddForm)}
            title="Add challenge"
          >
            +
          </button>
        </div>

        {skill.description && (
          <p className="skill-description">{skill.description}</p>
        )}

        {showAddForm && (
          <form className="add-form" onSubmit={handleCreateChallenge}>
            <input
              type="text"
              placeholder="Challenge name"
              value={newChallengeName}
              onChange={(e) => setNewChallengeName(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newChallengeDescription}
              onChange={(e) => setNewChallengeDescription(e.target.value)}
            />
            <input
              type="number"
              placeholder="XP Reward"
              value={newChallengeXPReward}
              onChange={(e) =>
                setNewChallengeXPReward(parseInt(e.target.value) || 5)
              }
              min="1"
              required
            />
            <div className="form-actions">
              <button type="submit" disabled={creatingChallenge}>
                {creatingChallenge ? (
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
                disabled={creatingChallenge}
              >
                Cancel
              </button>
            </div>
          </form>
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
                } ${draggedChallengeId === challenge._id ? "dragging" : ""} ${
                  dragOverChallengeId === challenge._id ? "drag-over" : ""
                }`}
                draggable={editingChallengeId !== challenge._id}
                onDragStart={() => handleDragStart(challenge._id)}
                onDragOver={(e) => handleDragOver(e, challenge._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, challenge._id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  hapticFeedback.selection();
                  setSelectedChallengeId(challenge._id);
                }}
                onMouseLeave={(e) => {
                  if (openMenuId === challenge._id) {
                    // Check if mouse is moving to the menu
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (
                      !relatedTarget ||
                      !relatedTarget.closest(".challenge-menu-container")
                    ) {
                      // Add a small delay to allow moving to the menu
                      const timeout = setTimeout(() => {
                        setOpenMenuId(null);
                      }, 150);
                      setMenuCloseTimeout(timeout);
                    }
                  }
                }}
                onMouseEnter={() => {
                  // Clear any pending close timeout when hovering back
                  if (menuCloseTimeout) {
                    clearTimeout(menuCloseTimeout);
                    setMenuCloseTimeout(null);
                  }
                }}
              >
                {editingChallengeId === challenge._id ? (
                  <form
                    className="edit-form"
                    onSubmit={(e) => handleUpdateChallenge(challenge._id, e)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editChallengeName}
                      onChange={(e) => setEditChallengeName(e.target.value)}
                      required
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={editChallengeDescription}
                      onChange={(e) =>
                        setEditChallengeDescription(e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <input
                      type="number"
                      placeholder="XP Reward"
                      value={editChallengeXPReward}
                      onChange={(e) =>
                        setEditChallengeXPReward(parseInt(e.target.value) || 5)
                      }
                      min="1"
                      required
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="edit-form-actions">
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
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setEditingChallengeId(null)}
                        disabled={updatingChallenge === challenge._id}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="challenge-info">
                      <div className="challenge-name">{challenge.name}</div>
                      <div className="challenge-stats">
                        <span className="challenge-xp">
                          +{challenge.xpReward} XP
                        </span>
                        <div
                          className="challenge-menu-container"
                          onMouseEnter={() => {
                            // Clear any pending close timeout when hovering over menu
                            if (menuCloseTimeout) {
                              clearTimeout(menuCloseTimeout);
                              setMenuCloseTimeout(null);
                            }
                          }}
                          onMouseLeave={() => {
                            // Close menu when leaving the menu container
                            if (openMenuId === challenge._id) {
                              setOpenMenuId(null);
                            }
                          }}
                        >
                          <button
                            className="challenge-menu-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === challenge._id
                                  ? null
                                  : challenge._id
                              );
                            }}
                            title="More options"
                          >
                            ⋯
                          </button>
                          {openMenuId === challenge._id && (
                            <div className="challenge-menu">
                              <button
                                className="challenge-menu-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditChallenge(challenge, e);
                                  setOpenMenuId(null);
                                }}
                                disabled={
                                  deletingChallenge === challenge._id ||
                                  updatingChallenge === challenge._id
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="challenge-menu-item delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChallenge(
                                    challenge._id,
                                    challenge.name,
                                    e
                                  );
                                  setOpenMenuId(null);
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
                                  "Delete"
                                )}
                              </button>
                              <button
                                className="challenge-menu-item complete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteChallenge(challenge, e);
                                  setOpenMenuId(null);
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
                                  "Complete"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedChallenge && (
        <div
          className="challenge-detail"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
            <h2 className="challenge-detail-title">{selectedChallenge.name}</h2>
            <button
              className="challenge-nav-arrow challenge-nav-arrow-right"
              onClick={navigateToNextChallenge}
              disabled={!canNavigateNext}
              title="Next challenge"
              aria-label="Next challenge"
            >
              ›
            </button>
            <div className="challenge-detail-menu-container">
              <button
                className="challenge-detail-menu-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailMenuOpen(!detailMenuOpen);
                }}
                title="More options"
              >
                ⋯
              </button>
              {detailMenuOpen && (
                <div className="challenge-detail-menu">
                  <button
                    className="challenge-detail-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditChallenge(selectedChallenge, e);
                      setDetailMenuOpen(false);
                    }}
                    disabled={
                      deletingChallenge === selectedChallenge._id ||
                      updatingChallenge === selectedChallenge._id
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="challenge-detail-menu-item delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChallenge(
                        selectedChallenge._id,
                        selectedChallenge.name,
                        e
                      );
                      setDetailMenuOpen(false);
                    }}
                    disabled={
                      deletingChallenge === selectedChallenge._id ||
                      updatingChallenge === selectedChallenge._id ||
                      completingChallenge === selectedChallenge._id
                    }
                  >
                    {deletingChallenge === selectedChallenge._id ? (
                      <>
                        <Spinner size="sm" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                  <button
                    className="challenge-detail-menu-item complete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteChallenge(selectedChallenge, e);
                      setDetailMenuOpen(false);
                    }}
                    disabled={
                      completingChallenge === selectedChallenge._id ||
                      deletingChallenge === selectedChallenge._id ||
                      updatingChallenge === selectedChallenge._id
                    }
                  >
                    {completingChallenge === selectedChallenge._id ? (
                      <>
                        <Spinner size="sm" />
                        <span>Completing...</span>
                      </>
                    ) : (
                      "Complete"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="challenge-detail-description-container">
            {editingChallengeDescription ? (
              <div className="challenge-detail-description-editor">
                <textarea
                  ref={textareaRef}
                  className="challenge-detail-description-textarea"
                  value={challengeDescription}
                  onChange={(e) => setChallengeDescription(e.target.value)}
                  placeholder="Add a description for this challenge..."
                  disabled={savingChallengeDescription}
                  rows={8}
                  autoFocus
                />
                <div className="challenge-detail-description-actions">
                  <button
                    className="save-button"
                    onClick={handleSaveChallengeDescription}
                    disabled={savingChallengeDescription}
                  >
                    {savingChallengeDescription ? (
                      <>
                        <Spinner size="sm" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    className="cancel-button"
                    onClick={handleCancelEditDescription}
                    disabled={savingChallengeDescription}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="challenge-detail-description-readonly">
                {challengeDescription ? (
                  <p className="challenge-detail-description">
                    {linkifyText(challengeDescription)}
                  </p>
                ) : (
                  <p className="challenge-detail-description no-description">
                    No description provided.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="challenge-detail-xp">
            <span className="xp-label">XP Reward</span>
            <span className="xp-value">+{selectedChallenge.xpReward}</span>
          </div>
          <div className="challenge-detail-actions">
            <div className="challenge-detail-action-buttons">
              <button
                className="challenge-detail-action-button edit"
                onClick={handleEditDescription}
                disabled={
                  deletingChallenge === selectedChallenge._id ||
                  editingChallengeDescription ||
                  savingChallengeDescription ||
                  completingChallenge === selectedChallenge._id
                }
              >
                {savingChallengeDescription ? (
                  <>
                    <Spinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : editingChallengeDescription ? (
                  <>
                    <span className="button-icon">✕</span>
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">✏️</span>
                    <span>Edit</span>
                  </>
                )}
              </button>
              <button
                className="challenge-detail-action-button delete"
                onClick={(e) =>
                  handleDeleteChallenge(
                    selectedChallenge._id,
                    selectedChallenge.name,
                    e
                  )
                }
                disabled={
                  deletingChallenge === selectedChallenge._id ||
                  updatingChallenge === selectedChallenge._id ||
                  completingChallenge === selectedChallenge._id
                }
              >
                {deletingChallenge === selectedChallenge._id ? (
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
              <button
                className={`challenge-detail-action-button todo ${
                  todoChallengeIds.has(selectedChallenge._id) ? "in-todo" : ""
                }`}
                onClick={() => handleToggleTodo(selectedChallenge)}
                disabled={
                  deletingChallenge === selectedChallenge._id ||
                  completingChallenge === selectedChallenge._id
                }
              >
                <span className="button-icon">
                  {todoChallengeIds.has(selectedChallenge._id) ? "✓" : "➕"}
                </span>
                <span>
                  {todoChallengeIds.has(selectedChallenge._id)
                    ? "In To-Do"
                    : "+ To-Do"}
                </span>
              </button>
              <button
                className="challenge-detail-action-button complete"
                onClick={(e) => handleCompleteChallenge(selectedChallenge, e)}
                disabled={
                  completingChallenge === selectedChallenge._id ||
                  deletingChallenge === selectedChallenge._id ||
                  updatingChallenge === selectedChallenge._id
                }
              >
                {completingChallenge === selectedChallenge._id ? (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
