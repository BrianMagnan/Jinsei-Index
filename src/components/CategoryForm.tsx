import { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (category) {
        await categoryAPI.update(category._id, { name, description });
      } else {
        await categoryAPI.create({ name, description });
      }

      setName("");
      setDescription("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <h3>{category ? "Edit Category" : "Create Category"}</h3>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="category-name">Name *</label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Music"
        />
      </div>

      <div className="form-group">
        <label htmlFor="category-description">Description</label>
        <textarea
          id="category-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : category ? "Update" : "Create"}
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
