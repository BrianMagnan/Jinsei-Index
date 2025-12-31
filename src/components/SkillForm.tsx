import { useState, useEffect } from "react";
import { skillAPI, categoryAPI } from "../services/api";
import type { Skill, Category } from "../types";

interface SkillFormProps {
  skill?: Skill;
  initialCategoryId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SkillForm({
  skill,
  initialCategoryId,
  onSuccess,
  onCancel,
}: SkillFormProps) {
  const [name, setName] = useState(skill?.name || "");
  const [description, setDescription] = useState(skill?.description || "");
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ||
      (typeof skill?.category === "object"
        ? skill.category._id
        : skill?.category) ||
      ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description || "");
      setCategoryId(
        typeof skill.category === "object" ? skill.category._id : skill.category
      );
    }
  }, [skill]);

  const loadCategories = async () => {
    try {
      const data = await categoryAPI.getAll();
      setCategories(data);
      if (data.length > 0 && !categoryId && !initialCategoryId) {
        setCategoryId(data[0]._id);
      }
    } catch (err) {
      setError("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (skill) {
        await skillAPI.update(skill._id, {
          name,
          description,
          category: categoryId,
        });
      } else {
        await skillAPI.create({ name, description, category: categoryId });
      }

      setName("");
      setDescription("");
      if (!initialCategoryId) setCategoryId("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skill");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCategories) {
    return <div className="form-loading">Loading categories...</div>;
  }

  if (categories.length === 0) {
    return <div className="form-error">Please create a category first.</div>;
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h3>{skill ? "Edit Skill" : "Create Skill"}</h3>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="skill-name">Name *</label>
        <input
          id="skill-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Piano"
        />
      </div>

      <div className="form-group">
        <label htmlFor="skill-description">Description</label>
        <textarea
          id="skill-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="skill-category">Category *</label>
        <select
          id="skill-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          disabled={!!initialCategoryId}
        >
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : skill ? "Update" : "Create"}
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
