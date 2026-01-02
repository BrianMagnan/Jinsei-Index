import { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";
import type { Category } from "../types";

interface SidebarProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function Sidebar({
  selectedCategoryId,
  onCategorySelect,
}: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
    null
  );
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();

      // Apply saved order from localStorage
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const orderedCategories = orderArray
            .map((id) => data.find((cat: Category) => cat._id === id))
            .filter((cat): cat is Category => cat !== undefined);

          // Add any new categories that aren't in the saved order
          const existingIds = new Set(orderArray);
          const newCategories = data.filter(
            (cat: Category) => !existingIds.has(cat._id)
          );

          setCategories([...orderedCategories, ...newCategories]);
        } catch {
          setCategories(data);
        }
      } else {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCategoryOrder = (newOrder: Category[]) => {
    const orderIds = newOrder.map((cat) => cat._id);
    localStorage.setItem("categoryOrder", JSON.stringify(orderIds));
  };

  const handleDragStart = (categoryId: string) => {
    setDraggedCategoryId(categoryId);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (draggedCategoryId && draggedCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategoryId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      setDraggedCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }

    const draggedIndex = categories.findIndex(
      (cat) => cat._id === draggedCategoryId
    );
    const targetIndex = categories.findIndex(
      (cat) => cat._id === targetCategoryId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...categories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    setCategories(newCategories);
    saveCategoryOrder(newCategories);
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const handleDragEnd = () => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await categoryAPI.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddForm(false);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleEditCategory = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategoryId(category._id);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || "");
  };

  const handleUpdateCategory = async (
    categoryId: string,
    e: React.FormEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editCategoryName.trim()) return;

    try {
      await categoryAPI.update(categoryId, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || undefined,
      });
      setEditingCategoryId(null);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This will also delete all associated skills and challenges.`
      )
    ) {
      return;
    }

    try {
      await categoryAPI.delete(categoryId);
      if (selectedCategoryId === categoryId) {
        onCategorySelect(null); // Clear selection if deleted
      }
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Categories</h2>
        <button
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add category"
        >
          +
        </button>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={handleCreateCategory}>
          <input
            type="text"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
            autoFocus
          />

          <div className="form-actions">
            <button type="submit">Add</button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="sidebar-loading">Loading...</div>
      ) : (
        <>
          {filteredCategories.length === 0 && searchQuery ? (
            <div className="sidebar-empty">
              No categories match "{searchQuery}"
            </div>
          ) : (
            <ul className="category-list">
              {filteredCategories.map((category) => (
            <li
              key={category._id}
              className={`category-item ${
                selectedCategoryId === category._id ? "active" : ""
              } ${draggedCategoryId === category._id ? "dragging" : ""} ${
                dragOverCategoryId === category._id ? "drag-over" : ""
              }`}
              draggable={editingCategoryId !== category._id}
              onDragStart={() => handleDragStart(category._id)}
              onDragOver={(e) => handleDragOver(e, category._id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category._id)}
              onDragEnd={handleDragEnd}
              onClick={() => onCategorySelect(category._id)}
            >
              {editingCategoryId === category._id ? (
                <form
                  className="edit-form"
                  onSubmit={(e) => handleUpdateCategory(category._id, e)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    required
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="edit-form-actions">
                    <button type="submit" className="save-button">
                      Save
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => setEditingCategoryId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="category-name">{category.name}</span>
                  <div className="category-actions">
                    <button
                      className="edit-button"
                      onClick={(e) => handleEditCategory(category, e)}
                      title="Edit category"
                    >
                      ✎
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) =>
                        handleDeleteCategory(category._id, category.name, e)
                      }
                      title="Delete category"
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
        </>
      )}
    </aside>
  );
}
