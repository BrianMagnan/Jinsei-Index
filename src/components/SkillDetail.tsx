import { useEffect, useState } from "react";
import { skillAPI, subSkillAPI } from "../services/api";
import type { SkillWithHierarchy } from "../types";

interface SkillDetailProps {
  skillId: string;
  onBack: () => void;
  onSubSkillClick: (subSkillId: string) => void;
}

export function SkillDetail({
  skillId,
  onBack,
  onSubSkillClick,
}: SkillDetailProps) {
  const [skill, setSkill] = useState<SkillWithHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubSkillForm, setShowSubSkillForm] = useState(false);
  const [newSubSkillName, setNewSubSkillName] = useState("");
  const [newSubSkillDescription, setNewSubSkillDescription] = useState("");
  const [creatingSubSkill, setCreatingSubSkill] = useState(false);

  useEffect(() => {
    loadSkill();
  }, [skillId]);

  const loadSkill = async () => {
    try {
      setLoading(true);
      const data = await skillAPI.getById(skillId);
      setSkill(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skill");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubSkillName.trim()) return;

    try {
      setCreatingSubSkill(true);
      await subSkillAPI.create({
        name: newSubSkillName.trim(),
        description: newSubSkillDescription.trim() || undefined,
        skill: skillId,
      });
      setNewSubSkillName("");
      setNewSubSkillDescription("");
      setShowSubSkillForm(false);
      await loadSkill();
    } catch (err) {
      console.error("Failed to create subSkill:", err);
      alert(err instanceof Error ? err.message : "Failed to create subSkill");
    } finally {
      setCreatingSubSkill(false);
    }
  };

  if (loading) {
    return <div className="skill-detail-loading">Loading skill...</div>;
  }

  if (error || !skill) {
    return (
      <div className="skill-detail-error">
        <p>{error || "Skill not found"}</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const totalSubSkills = skill.subSkills?.length || 0;

  return (
    <div className="skill-detail">
      <div className="skill-detail-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <div className="skill-detail-title-section">
          <div className="skill-category-badge">
            {typeof skill.category === "object"
              ? skill.category.name
              : "Category"}
          </div>
          <h1>{skill.name}</h1>
          {skill.description && (
            <p className="skill-detail-description">{skill.description}</p>
          )}
        </div>
      </div>

      <div className="skill-detail-subskills">
        <div className="subskills-header">
          <h2>SubSkills</h2>
          <button
            className="add-subskill-button"
            onClick={() => setShowSubSkillForm(!showSubSkillForm)}
            title="Add new subSkill"
          >
            +
          </button>
        </div>

        {showSubSkillForm && (
          <form
            className="subskill-form-inline"
            onSubmit={handleCreateSubSkill}
          >
            <input
              type="text"
              placeholder="SubSkill name"
              value={newSubSkillName}
              onChange={(e) => setNewSubSkillName(e.target.value)}
              required
              autoFocus
              className="subskill-form-input"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newSubSkillDescription}
              onChange={(e) => setNewSubSkillDescription(e.target.value)}
              className="subskill-form-input"
            />
            <div className="subskill-form-actions">
              <button
                type="submit"
                className="subskill-form-submit"
                disabled={creatingSubSkill}
              >
                {creatingSubSkill ? "Creating..." : "Add"}
              </button>
              <button
                type="button"
                className="subskill-form-cancel"
                onClick={() => {
                  setShowSubSkillForm(false);
                  setNewSubSkillName("");
                  setNewSubSkillDescription("");
                }}
                disabled={creatingSubSkill}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {totalSubSkills === 0 ? (
          <div className="skill-detail-empty">
            No subSkills yet. Create your first subSkill.
          </div>
        ) : (
          <div className="subskills-linked-list">
            {skill.subSkills?.map((subSkill) => (
              <div
                key={subSkill._id}
                className="subskill-link-card"
                onClick={() => onSubSkillClick(subSkill._id)}
              >
                <div className="subskill-link-content">
                  <h3>{subSkill.name}</h3>
                  {subSkill.description && (
                    <p className="subskill-link-description">
                      {subSkill.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
