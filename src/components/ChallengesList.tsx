import { useState, useEffect } from "react";
import { challengeAPI, achievementAPI, skillAPI } from "../services/api";
import type { SkillWithHierarchy, Challenge } from "../types";
import { Spinner } from "./Spinner";

interface ChallengesListProps {
  skillId: string;
}

export function ChallengesList({ skillId }: ChallengesListProps) {
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
  const [newChallengeXPReward, setNewChallengeXPReward] = useState(10);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null
  );
  const [editChallengeName, setEditChallengeName] = useState("");
  const [editChallengeDescription, setEditChallengeDescription] = useState("");
  const [editChallengeXPReward, setEditChallengeXPReward] = useState(10);
  const [draggedChallengeId, setDraggedChallengeId] = useState<string | null>(
    null
  );
  const [dragOverChallengeId, setDragOverChallengeId] = useState<string | null>(
    null
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [menuCloseTimeout, setMenuCloseTimeout] = useState<number | null>(null);

  useEffect(() => {
    loadSkill();
  }, [skillId]);

  useEffect(() => {
    // Auto-select first challenge if available
    if (
      skill?.challenges &&
      skill.challenges.length > 0 &&
      !selectedChallengeId
    ) {
      setSelectedChallengeId(skill.challenges[0]._id);
    }
  }, [skill, selectedChallengeId]);

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
      setNewChallengeXPReward(10);
      setShowAddForm(false);
      await loadSkill();
      // Auto-select the newly created challenge
      const updatedSkill = await skillAPI.getById(skillId);
      if (updatedSkill.challenges && updatedSkill.challenges.length > 0) {
        const newChallenge =
          updatedSkill.challenges[updatedSkill.challenges.length - 1];
        setSelectedChallengeId(newChallenge._id);
      }
    } catch (err) {
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

    setCompletingChallenge(challenge._id);
    try {
      await achievementAPI.create({ challenge: challenge._id });
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
      alert(
        err instanceof Error ? err.message : "Failed to complete challenge"
      );
    } finally {
      setCompletingChallenge(null);
    }
  };

  const handleEditChallenge = (challenge: Challenge, e: React.MouseEvent) => {
    e.stopPropagation();
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
    } catch (err) {
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

    if (!confirm(`Are you sure you want to delete "${challengeName}"?`)) {
      return;
    }

    setDeletingChallenge(challengeId);
    try {
      await challengeAPI.delete(challengeId);
      await loadSkill();
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
      alert(err instanceof Error ? err.message : "Failed to delete challenge");
    } finally {
      setDeletingChallenge(null);
    }
  };

  const selectedChallenge = skill?.challenges?.find(
    (c) => c._id === selectedChallengeId
  );

  if (loading) {
    return (
      <div className="loading">
        <Spinner size="md" />
        <span>Loading challenges...</span>
      </div>
    );
  }

  if (!skill) {
    return <div className="empty-state">Skill not found</div>;
  }

  return (
    <div
      className={`challenges-container ${
        !selectedChallengeId ? "full-width" : ""
      }`}
    >
      <div className="challenges-list">
        <div className="section-header">
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
                setNewChallengeXPReward(parseInt(e.target.value) || 10)
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
          <div className="empty-state">
            No challenges yet. Create your first challenge!
          </div>
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
                onClick={() => setSelectedChallengeId(challenge._id)}
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
                        setEditChallengeXPReward(parseInt(e.target.value) || 10)
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
        <div className="challenge-detail">
          <div className="challenge-detail-header">
            <h2 className="challenge-detail-title">{selectedChallenge.name}</h2>
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
          {selectedChallenge.description ? (
            <p className="challenge-detail-description">
              {selectedChallenge.description}
            </p>
          ) : (
            <p className="challenge-detail-description no-description">
              No description provided.
            </p>
          )}
          <div className="challenge-detail-actions">
            <div className="challenge-detail-xp">
              <span className="xp-label">XP Reward</span>
              <span className="xp-value">+{selectedChallenge.xpReward}</span>
            </div>
            <button
              className="complete-button"
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
                "Complete"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
