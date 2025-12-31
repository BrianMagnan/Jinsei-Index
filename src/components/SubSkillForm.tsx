import { useState, useEffect } from "react";
import { subSkillAPI, skillAPI } from "../services/api";
import type { SubSkill, Skill } from "../types";

interface SubSkillFormProps {
  subSkill?: SubSkill;
  initialSkillId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubSkillForm({
  subSkill,
  initialSkillId,
  onSuccess,
  onCancel,
}: SubSkillFormProps) {
  const [name, setName] = useState(subSkill?.name || "");
  const [description, setDescription] = useState(subSkill?.description || "");
  const [skillId, setSkillId] = useState(
    initialSkillId ||
      (typeof subSkill?.skill === "object"
        ? subSkill.skill._id
        : subSkill?.skill) ||
      ""
  );
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    if (subSkill) {
      setName(subSkill.name);
      setDescription(subSkill.description || "");
      setSkillId(
        typeof subSkill.skill === "object" ? subSkill.skill._id : subSkill.skill
      );
    }
  }, [subSkill]);

  const loadSkills = async () => {
    try {
      const data = await skillAPI.getAll();
      setSkills(data);
      if (data.length > 0 && !skillId && !initialSkillId) {
        setSkillId(data[0]._id);
      }
    } catch (err) {
      setError("Failed to load skills");
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (subSkill) {
        await subSkillAPI.update(subSkill._id, {
          name,
          description,
          skill: skillId,
        });
      } else {
        await subSkillAPI.create({ name, description, skill: skillId });
      }

      setName("");
      setDescription("");
      if (!initialSkillId) setSkillId("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save subSkill");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSkills) {
    return <div className="form-loading">Loading skills...</div>;
  }

  if (skills.length === 0) {
    return <div className="form-error">Please create a skill first.</div>;
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h3>{subSkill ? "Edit SubSkill" : "Create SubSkill"}</h3>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="subskill-name">Name *</label>
        <input
          id="subskill-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Speed"
        />
      </div>

      <div className="form-group">
        <label htmlFor="subskill-description">Description</label>
        <textarea
          id="subskill-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="subskill-skill">Skill *</label>
        <select
          id="subskill-skill"
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          required
          disabled={!!initialSkillId}
        >
          {skills.map((skill) => (
            <option key={skill._id} value={skill._id}>
              {skill.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : subSkill ? "Update" : "Create"}
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
