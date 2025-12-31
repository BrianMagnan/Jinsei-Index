import { useState, useEffect } from "react";
import { challengeAPI, subSkillAPI } from "../services/api";
import type { Challenge, SubSkill } from "../types";

interface ChallengeFormProps {
  challenge?: Challenge;
  initialSubSkillId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChallengeForm({
  challenge,
  initialSubSkillId,
  onSuccess,
  onCancel,
}: ChallengeFormProps) {
  const [name, setName] = useState(challenge?.name || "");
  const [description, setDescription] = useState(challenge?.description || "");
  const [xpReward, setXpReward] = useState(challenge?.xpReward || 10);
  const [subSkillId, setSubSkillId] = useState(
    initialSubSkillId ||
      (typeof challenge?.subSkill === "object"
        ? challenge.subSkill._id
        : challenge?.subSkill) ||
      ""
  );
  const [subSkills, setSubSkills] = useState<SubSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubSkills, setLoadingSubSkills] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubSkills();
  }, []);

  useEffect(() => {
    if (challenge) {
      setName(challenge.name);
      setDescription(challenge.description || "");
      setXpReward(challenge.xpReward);
      setSubSkillId(
        typeof challenge.subSkill === "object"
          ? challenge.subSkill._id
          : challenge.subSkill
      );
    }
  }, [challenge]);

  const loadSubSkills = async () => {
    try {
      const data = await subSkillAPI.getAll();
      setSubSkills(data);
      if (data.length > 0 && !subSkillId && !initialSubSkillId) {
        setSubSkillId(data[0]._id);
      }
    } catch (err) {
      setError("Failed to load subSkills");
    } finally {
      setLoadingSubSkills(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (challenge) {
        await challengeAPI.update(challenge._id, {
          name,
          description,
          subSkill: subSkillId,
          xpReward,
        });
      } else {
        await challengeAPI.create({
          name,
          description,
          subSkill: subSkillId,
          xpReward,
        });
      }

      setName("");
      setDescription("");
      setXpReward(10);
      if (!initialSubSkillId) setSubSkillId("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save challenge");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSubSkills) {
    return <div className="form-loading">Loading subSkills...</div>;
  }

  if (subSkills.length === 0) {
    return <div className="form-error">Please create a subSkill first.</div>;
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h3>{challenge ? "Edit Challenge" : "Create Challenge"}</h3>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="challenge-name">Name *</label>
        <input
          id="challenge-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Scales 80bpm"
        />
      </div>

      <div className="form-group">
        <label htmlFor="challenge-description">Description</label>
        <textarea
          id="challenge-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="challenge-subskill">SubSkill *</label>
        <select
          id="challenge-subskill"
          value={subSkillId}
          onChange={(e) => setSubSkillId(e.target.value)}
          required
          disabled={!!initialSubSkillId}
        >
          {subSkills.map((subSkill) => (
            <option key={subSkill._id} value={subSkill._id}>
              {subSkill.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="challenge-xp">XP Reward *</label>
        <input
          id="challenge-xp"
          type="number"
          value={xpReward}
          onChange={(e) => setXpReward(parseInt(e.target.value) || 0)}
          min="1"
          required
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : challenge ? "Update" : "Create"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
