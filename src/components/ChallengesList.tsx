import { useState, useEffect } from "react";
import { challengeAPI, achievementAPI, skillAPI } from "../services/api";
import type { SkillWithHierarchy, Challenge } from "../types";

interface ChallengesListProps {
  skillId: string;
}

export function ChallengesList({ skillId }: ChallengesListProps) {
  const [skill, setSkill] = useState<SkillWithHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
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
              .map((id) => data.challenges?.find((c) => c._id === id))
              .filter((c): c is Challenge => c !== undefined);

            // Add any new challenges that aren't in the saved order
            const existingIds = new Set(orderArray);
            const newChallenges = data.challenges.filter(
              (c) => !existingIds.has(c._id)
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
    if (!newChallengeName.trim()) return;

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
    }
  };

  const handleCompleteChallenge = async (challenge: Challenge) => {
    try {
      await achievementAPI.create({ challenge: challenge._id });
      await loadSkill(); // Reload to refresh skill data
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
    if (!editChallengeName.trim()) return;

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
    }
  };

  const handleDeleteChallenge = async (
    challengeId: string,
    challengeName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${challengeName}"?`)) {
      return;
    }

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
    }
  };

  const selectedChallenge = skill?.challenges?.find(
    (c) => c._id === selectedChallengeId
  );

  if (loading) {
    return <div className="loading">Loading challenges...</div>;
  }

  if (!skill) {
    return <div className="empty-state">Skill not found</div>;
  }

  return (
    <div className="challenges-container">
      <div className="challenges-list">
        <div className="section-header">
          <div className="header-title-section">
            <h2>{skill.name}</h2>
            {/* <span className="skill-level">Level {skill.level}</span> */}
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
              <button type="submit">Add</button>
              <button type="button" onClick={() => setShowAddForm(false)}>
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
                      <button type="submit" className="save-button">
                        Save
                      </button>
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setEditingChallengeId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="challenge-info">
                      <div className="challenge-name">{challenge.name}</div>
                      <div className="challenge-xp">
                        +{challenge.xpReward} XP
                      </div>
                    </div>
                    <div className="challenge-actions">
                      <button
                        className="edit-button"
                        onClick={(e) => handleEditChallenge(challenge, e)}
                        title="Edit challenge"
                      >
                        ✎
                      </button>
                      <button
                        className="delete-button"
                        onClick={(e) =>
                          handleDeleteChallenge(
                            challenge._id,
                            challenge.name,
                            e
                          )
                        }
                        title="Delete challenge"
                      >
                        ×
                      </button>
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
            <div className="challenge-detail-header-actions">
              <button
                className="edit-button"
                onClick={(e) => handleEditChallenge(selectedChallenge, e)}
                title="Edit challenge"
              >
                ✎
              </button>
              <button
                className="delete-button"
                onClick={(e) =>
                  handleDeleteChallenge(
                    selectedChallenge._id,
                    selectedChallenge.name,
                    e
                  )
                }
                title="Delete challenge"
              >
                ×
              </button>
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
              onClick={(e) => {
                e.stopPropagation();
                handleCompleteChallenge(selectedChallenge);
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
