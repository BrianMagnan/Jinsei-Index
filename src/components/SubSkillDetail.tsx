import { useEffect, useState } from "react";
import { subSkillAPI, challengeAPI, achievementAPI } from "../services/api";
import type { SubSkillWithHierarchy, Challenge } from "../types";

interface SubSkillDetailProps {
  subSkillId: string;
  onBack: () => void;
}

export function SubSkillDetail({
  subSkillId,
  onBack,
}: SubSkillDetailProps) {
  const [subSkill, setSubSkill] = useState<SubSkillWithHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [newChallengeName, setNewChallengeName] = useState("");
  const [newChallengeDescription, setNewChallengeDescription] = useState("");
  const [newChallengeXPReward, setNewChallengeXPReward] = useState(10);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadSubSkill();
  }, [subSkillId]);

  const loadSubSkill = async () => {
    try {
      setLoading(true);
      const data = await subSkillAPI.getById(subSkillId);
      setSubSkill(data);
      setError(null);
      // Auto-select first challenge if available
      if (data.challenges && data.challenges.length > 0) {
        setSelectedChallengeId(data.challenges[0]._id);
      } else {
        setSelectedChallengeId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subSkill");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengeName.trim()) return;

    try {
      setCreatingChallenge(true);
      await challengeAPI.create({
        name: newChallengeName.trim(),
        description: newChallengeDescription.trim() || undefined,
        subSkill: subSkillId,
        xpReward: newChallengeXPReward,
      });
      setNewChallengeName("");
      setNewChallengeDescription("");
      setNewChallengeXPReward(10);
      setShowChallengeForm(false);
      await loadSubSkill(); // This will auto-select the newly created challenge
    } catch (err) {
      console.error("Failed to create challenge:", err);
      alert(
        err instanceof Error ? err.message : "Failed to create challenge"
      );
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleChallengeClick = (challengeId: string) => {
    setSelectedChallengeId(challengeId);
  };

  const handleCompleteChallenge = async (challenge: Challenge) => {
    try {
      await achievementAPI.create({ challenge: challenge._id });
      await loadSubSkill(); // Reload will auto-select first challenge
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to complete challenge"
      );
    }
  };

  const selectedChallenge = subSkill?.challenges?.find(
    (c) => c._id === selectedChallengeId
  );

  if (loading) {
    return <div className="subskill-detail-loading">Loading subSkill...</div>;
  }

  if (error || !subSkill) {
    return (
      <div className="subskill-detail-error">
        <p>{error || "SubSkill not found"}</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const totalChallenges = subSkill.challenges?.length || 0;

  return (
    <div className="subskill-detail">
      <div className="subskill-detail-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <div className="subskill-detail-title-section">
          <div className="subskill-breadcrumb">
            {typeof subSkill.skill === "object" && subSkill.skill.category && (
              <span className="breadcrumb-item">
                {typeof subSkill.skill.category === "object"
                  ? subSkill.skill.category.name
                  : "Category"}
              </span>
            )}
            {typeof subSkill.skill === "object" && (
              <>
                <span className="breadcrumb-separator">›</span>
                <span className="breadcrumb-item">{subSkill.skill.name}</span>
              </>
            )}
          </div>
          <h1>{subSkill.name}</h1>
          {subSkill.description && (
            <p className="subskill-detail-description">
              {subSkill.description}
            </p>
          )}
        </div>
      </div>

      <div className="subskill-detail-content">
        <div className="subskill-detail-sidebar">
          <div className="challenges-header">
            <h3>Quests</h3>
            <button
              className="add-challenge-button"
              onClick={() => setShowChallengeForm(!showChallengeForm)}
              title="Add new quest"
            >
              +
            </button>
          </div>

          {showChallengeForm && (
            <form
              className="challenge-form-inline"
              onSubmit={handleCreateChallenge}
            >
              <input
                type="text"
                placeholder="Quest name"
                value={newChallengeName}
                onChange={(e) => setNewChallengeName(e.target.value)}
                required
                autoFocus
                className="challenge-form-input"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newChallengeDescription}
                onChange={(e) => setNewChallengeDescription(e.target.value)}
                className="challenge-form-input"
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
                className="challenge-form-input"
              />
              <div className="challenge-form-actions">
                <button
                  type="submit"
                  className="challenge-form-submit"
                  disabled={creatingChallenge}
                >
                  {creatingChallenge ? "Creating..." : "Add"}
                </button>
                <button
                  type="button"
                  className="challenge-form-cancel"
                  onClick={() => {
                    setShowChallengeForm(false);
                    setNewChallengeName("");
                    setNewChallengeDescription("");
                    setNewChallengeXPReward(10);
                  }}
                  disabled={creatingChallenge}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {totalChallenges === 0 ? (
            <div className="challenges-sidebar-empty">No quests yet</div>
          ) : (
            <div className="challenges-list-sidebar">
              {subSkill.challenges?.map((challenge) => (
                <div
                  key={challenge._id}
                  className={`challenge-list-item ${
                    selectedChallengeId === challenge._id ? "selected" : ""
                  }`}
                  onClick={() => handleChallengeClick(challenge._id)}
                >
                  {challenge.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="subskill-detail-main">
          {totalChallenges === 0 ? (
            <div className="subskill-detail-empty">
              <h2>No quests yet</h2>
              <p>Create your first quest using the + button above to get started.</p>
            </div>
          ) : selectedChallenge ? (
            <div className="challenge-detail-view">
              <h2>{selectedChallenge.name}</h2>
              {selectedChallenge.description && (
                <p className="challenge-detail-description">
                  {selectedChallenge.description}
                </p>
              )}
              <div className="challenge-detail-meta">
                <span className="challenge-xp-badge">
                  +{selectedChallenge.xpReward} XP
                </span>
              </div>
              <button
                className="complete-challenge-button"
                onClick={() => handleCompleteChallenge(selectedChallenge)}
              >
                Complete Quest
              </button>
            </div>
          ) : (
            <div className="challenge-detail-placeholder">
              Select a quest from the list to view its details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

