import { useState, useEffect } from "react";
import { categoryAPI, skillAPI, challengeAPI } from "../services/api";
import type { Category, Profile, Skill, Challenge } from "../types";
import { Search, type SearchResult } from "./Search";
import { Spinner } from "./Spinner";

interface SidebarProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onSkillSelect?: (skillId: string, categoryId: string) => void;
  viewMode: "main" | "profiles";
  onViewModeChange: (mode: "main" | "profiles") => void;
  currentUser: Profile | null;
  onLogout: () => void;
}

export function Sidebar({
  selectedCategoryId,
  onCategorySelect,
  onSkillSelect,
  viewMode,
  onViewModeChange,
  currentUser,
  onLogout,
}: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (searchOpen) {
      loadAllSkillsAndChallenges();
    }
  }, [searchOpen]);

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

          // Sort new categories by creation date (oldest first) so newest appear at bottom
          newCategories.sort((a: Category, b: Category) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });

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

  const loadAllSkillsAndChallenges = async () => {
    try {
      const [skills, challenges] = await Promise.all([
        skillAPI.getAll(),
        challengeAPI.getAll(),
      ]);
      setAllSkills(skills);
      setAllChallenges(challenges);
    } catch (err) {
      console.error("Failed to load skills and challenges:", err);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSearchResults = (): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search categories
    categories.forEach((category) => {
      if (category.name.toLowerCase().includes(query)) {
        results.push({
          _id: category._id,
          name: category.name,
          type: "category",
        });
      }
    });

    // Search skills
    allSkills.forEach((skill) => {
      if (skill.name.toLowerCase().includes(query)) {
        const categoryId =
          typeof skill.category === "string"
            ? skill.category
            : skill.category._id;
        const categoryName =
          typeof skill.category === "string"
            ? categories.find((c) => c._id === categoryId)?.name
            : skill.category.name;

        results.push({
          _id: skill._id,
          name: skill.name,
          type: "skill",
          categoryId,
          categoryName: categoryName || "Unknown",
        });
      }
    });

    // Search challenges
    allChallenges.forEach((challenge) => {
      if (challenge.name.toLowerCase().includes(query)) {
        const skillId =
          typeof challenge.skill === "string"
            ? challenge.skill
            : challenge.skill._id;
        const skill =
          typeof challenge.skill === "string"
            ? allSkills.find((s) => s._id === skillId)
            : challenge.skill;

        if (skill) {
          const categoryId =
            typeof skill.category === "string"
              ? skill.category
              : skill.category._id;
          const categoryName =
            typeof skill.category === "string"
              ? categories.find((c) => c._id === categoryId)?.name
              : skill.category.name;

          results.push({
            _id: challenge._id,
            name: challenge.name,
            type: "challenge",
            categoryId,
            categoryName: categoryName || "Unknown",
            skillId,
            skillName: skill.name,
          });
        }
      }
    });

    return results;
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || creatingCategory) return;

    setCreatingCategory(true);
    try {
      const newCategory = await categoryAPI.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddForm(false);

      // Add new category to the end of the list and update localStorage order
      const savedOrder = localStorage.getItem("categoryOrder");
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          orderArray.push(newCategory._id);
          localStorage.setItem("categoryOrder", JSON.stringify(orderArray));
        } catch {
          // If parsing fails, just reload
        }
      } else {
        // No saved order, create one with the new category
        localStorage.setItem(
          "categoryOrder",
          JSON.stringify([newCategory._id])
        );
      }

      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
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
    if (!editCategoryName.trim() || updatingCategory === categoryId) return;

    setUpdatingCategory(categoryId);
    try {
      await categoryAPI.update(categoryId, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || undefined,
      });
      setEditingCategoryId(null);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setUpdatingCategory(null);
    }
  };

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingCategory === categoryId) return;

    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This will also delete all associated skills and challenges.`
      )
    ) {
      return;
    }

    setDeletingCategory(categoryId);
    try {
      await categoryAPI.delete(categoryId);
      if (selectedCategoryId === categoryId) {
        onCategorySelect(null); // Clear selection if deleted
      }
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCategory(null);
    }
  };

  // Close menu and search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        (menuOpen || searchOpen) &&
        !target.closest(".sidebar-menu-container")
      ) {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };

    if (menuOpen || searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, searchOpen]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-section">
          <div className="sidebar-menu-container">
            {currentUser && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{currentUser.name}</span>
              </div>
            )}
            <div className="sidebar-header-actions">
              <button
                className="search-icon-button"
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  if (!searchOpen) {
                    setMenuOpen(false);
                  }
                }}
                aria-label="Toggle search"
                title="Search categories"
              >
                🔍
              </button>
              <button
                className={`hamburger-menu ${menuOpen ? "active" : ""}`}
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  if (menuOpen) {
                    setSearchOpen(false);
                  }
                }}
                aria-label="Toggle menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
            {menuOpen && (
              <div className="sidebar-menu">
                <button
                  className={`sidebar-menu-item ${
                    viewMode === "main" ? "active" : ""
                  }`}
                  onClick={() => {
                    onViewModeChange("main");
                    setMenuOpen(false);
                  }}
                >
                  Home
                </button>
                <button
                  className={`sidebar-menu-item ${
                    viewMode === "profiles" ? "active" : ""
                  }`}
                  onClick={() => {
                    onViewModeChange("profiles");
                    setMenuOpen(false);
                  }}
                >
                  My Profile
                </button>
                <button
                  className="sidebar-menu-item logout"
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sidebar-content">
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
              <button type="submit" disabled={creatingCategory}>
                {creatingCategory ? (
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
                disabled={creatingCategory}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="sidebar-loading">
            <Spinner size="md" />
            <span>Loading categories...</span>
          </div>
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
                          <button
                            type="submit"
                            className="save-button"
                            disabled={updatingCategory === category._id}
                          >
                            {updatingCategory === category._id ? (
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
                            onClick={() => setEditingCategoryId(null)}
                            disabled={updatingCategory === category._id}
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
                            disabled={
                              deletingCategory === category._id ||
                              updatingCategory === category._id
                            }
                          >
                            ✎
                          </button>
                          <button
                            className="delete-button"
                            onClick={(e) =>
                              handleDeleteCategory(
                                category._id,
                                category.name,
                                e
                              )
                            }
                            title="Delete category"
                            disabled={
                              deletingCategory === category._id ||
                              updatingCategory === category._id
                            }
                          >
                            {deletingCategory === category._id ? (
                              <Spinner size="sm" />
                            ) : (
                              "×"
                            )}
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
      </div>
      {viewMode === "main" && (
        <div className="sidebar-footer">
          <button
            className="add-button"
            onClick={() => setShowAddForm(!showAddForm)}
            title="Add category"
          >
            +
          </button>
        </div>
      )}
      <Search
        isOpen={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery("");
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        results={getSearchResults()}
        onSelect={(result) => {
          if (result.type === "category") {
            onCategorySelect(result._id);
          } else if (result.type === "skill" && result.categoryId) {
            onCategorySelect(result.categoryId);
            if (onSkillSelect) {
              // Use setTimeout to ensure category is selected first
              setTimeout(() => {
                onSkillSelect(result._id, result.categoryId!);
              }, 100);
            }
          } else if (
            result.type === "challenge" &&
            result.categoryId &&
            result.skillId
          ) {
            onCategorySelect(result.categoryId);
            if (onSkillSelect) {
              // Use setTimeout to ensure category is selected first
              setTimeout(() => {
                onSkillSelect(result.skillId!, result.categoryId!);
              }, 100);
            }
          }
          // Modal will be closed by the Search component's handleSelect
        }}
        placeholder="Search categories, skills, and challenges..."
        emptyMessage={`No results match "${searchQuery}"`}
      />
    </aside>
  );
}
