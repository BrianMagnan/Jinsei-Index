import { useEffect, useState } from "react";
import { categoryAPI, skillAPI } from "../services/api";
import type { CategoryWithHierarchy } from "../types";

interface CategoryDetailProps {
  categoryId: string;
  onBack: () => void;
  onSkillClick: (skillId: string) => void;
}

export function CategoryDetail({
  categoryId,
  onBack,
  onSkillClick,
}: CategoryDetailProps) {
  const [category, setCategory] = useState<CategoryWithHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [creatingSkill, setCreatingSkill] = useState(false);

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  const loadCategory = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getById(categoryId);
      setCategory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="category-detail-loading">Loading category...</div>;
  }

  if (error || !category) {
    return (
      <div className="category-detail-error">
        <p>{error || "Category not found"}</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      setCreatingSkill(true);
      await skillAPI.create({
        name: newSkillName.trim(),
        description: newSkillDescription.trim() || undefined,
        category: categoryId,
      });
      setNewSkillName("");
      setNewSkillDescription("");
      setShowSkillForm(false);
      await loadCategory();
    } catch (err) {
      console.error("Failed to create skill:", err);
      alert(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreatingSkill(false);
    }
  };

  const totalSkills = category.skills?.length || 0;

  return (
    <div className="category-detail">
      <div className="category-detail-header">
        <div className="category-detail-title-section">
          <h1>{category.name}</h1>
          {category.description && (
            <p className="category-detail-description">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="category-detail-skills">
        <div className="skills-header">
          <h2>Skills</h2>
          <button
            className="add-skill-button"
            onClick={() => setShowSkillForm(!showSkillForm)}
            title="Add new skill"
          >
            +
          </button>
        </div>

        {showSkillForm && (
          <form className="skill-form-inline" onSubmit={handleCreateSkill}>
            <input
              type="text"
              placeholder="Skill name"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              required
              autoFocus
              className="skill-form-input"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newSkillDescription}
              onChange={(e) => setNewSkillDescription(e.target.value)}
              className="skill-form-input"
            />
            <div className="skill-form-actions">
              <button
                type="submit"
                className="skill-form-submit"
                disabled={creatingSkill}
              >
                {creatingSkill ? "Creating..." : "Add"}
              </button>
              <button
                type="button"
                className="skill-form-cancel"
                onClick={() => {
                  setShowSkillForm(false);
                  setNewSkillName("");
                  setNewSkillDescription("");
                }}
                disabled={creatingSkill}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {totalSkills === 0 ? (
          <div className="category-detail-empty">
            No skills yet. Create your first skill in the Management section.
          </div>
        ) : (
          <div className="skills-linked-list">
            {category.skills?.map((skill) => (
              <div
                key={skill._id}
                className="skill-link-card"
                onClick={() => onSkillClick(skill._id)}
              >
                <div className="skill-link-content">
                  <h3>{skill.name}</h3>
                  {skill.description && (
                    <p className="skill-link-description">
                      {skill.description}
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
