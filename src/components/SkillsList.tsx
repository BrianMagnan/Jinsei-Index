import { useState, useEffect, useRef } from "react";
import { skillAPI, categoryAPI } from "../services/api";
import type { Skill, Category } from "../types";
import { Spinner } from "./Spinner";

interface SkillsListProps {
  categoryId: string;
  category: Category | null;
  onSkillSelect: (skillId: string) => void;
  onCategoryUpdate?: () => void;
  onCategoryDelete?: () => void;
}

export function SkillsList({
  categoryId,
  category,
  onSkillSelect,
  onCategoryUpdate,
  onCategoryDelete,
}: SkillsListProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillDescription, setEditSkillDescription] = useState("");
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const [dragOverSkillId, setDragOverSkillId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuCloseTimeout, setMenuCloseTimeout] = useState<number | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [localCategory, setLocalCategory] = useState<Category | null>(category);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSkills();
  }, [categoryId]);

  useEffect(() => {
    setLocalCategory(category);
  }, [category]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest(".skill-menu-container")) {
        setOpenMenuId(null);
      }
      if (
        categoryMenuOpen &&
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(target)
      ) {
        setCategoryMenuOpen(false);
      }
    };

    if (openMenuId || categoryMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId, categoryMenuOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (menuCloseTimeout) {
        clearTimeout(menuCloseTimeout);
      }
    };
  }, [menuCloseTimeout]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await skillAPI.getAll(categoryId);

      // Apply saved order from localStorage
      const savedOrder = localStorage.getItem(`skillOrder-${categoryId}`);
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const orderedSkills = orderArray
            .map((id) => data.find((skill: Skill) => skill._id === id))
            .filter((skill): skill is Skill => skill !== undefined);

          // Add any new skills that aren't in the saved order to the end
          const existingIds = new Set(orderArray);
          const newSkills = data.filter(
            (skill: Skill) => !existingIds.has(skill._id)
          );

          // Sort new skills by creation date (newest last) to ensure they appear at bottom
          newSkills.sort((a: Skill, b: Skill) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB; // Oldest first, so newest appear at end
          });

          setSkills([...orderedSkills, ...newSkills]);
        } catch {
          // If parsing fails, sort by creation date (newest last)
          const sorted = [...data].sort((a: Skill, b: Skill) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
          setSkills(sorted);
        }
      } else {
        // No saved order: sort by creation date (newest last) so new skills appear at bottom
        const sorted = [...data].sort((a: Skill, b: Skill) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        setSkills(sorted);
      }
    } catch (err) {
      console.error("Failed to load skills:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || creatingSkill) return;

    setCreatingSkill(true);
    try {
      const newSkill = await skillAPI.create({
        name: newSkillName.trim(),
        description: newSkillDescription.trim() || undefined,
        category: categoryId,
      });

      // Add the new skill to the end of the saved order
      const savedOrder = localStorage.getItem(`skillOrder-${categoryId}`);
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          orderArray.push(newSkill._id);
          localStorage.setItem(
            `skillOrder-${categoryId}`,
            JSON.stringify(orderArray)
          );
        } catch {
          // If parsing fails, create new order with the new skill at the end
          const currentSkills = skills.map((s) => s._id);
          currentSkills.push(newSkill._id);
          localStorage.setItem(
            `skillOrder-${categoryId}`,
            JSON.stringify(currentSkills)
          );
        }
      } else {
        // If no saved order exists, create one with existing skills + new skill at the end
        const currentSkills = skills.map((s) => s._id);
        currentSkills.push(newSkill._id);
        localStorage.setItem(
          `skillOrder-${categoryId}`,
          JSON.stringify(currentSkills)
        );
      }

      setNewSkillName("");
      setNewSkillDescription("");
      setShowAddForm(false);
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreatingSkill(false);
    }
  };

  const handleEditSkill = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSkillId(skill._id);
    setEditSkillName(skill.name);
    setEditSkillDescription(skill.description || "");
  };

  const handleUpdateSkill = async (skillId: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editSkillName.trim() || updatingSkill === skillId) return;

    setUpdatingSkill(skillId);
    try {
      await skillAPI.update(skillId, {
        name: editSkillName.trim(),
        description: editSkillDescription.trim() || undefined,
      });
      setEditingSkillId(null);
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update skill");
    } finally {
      setUpdatingSkill(null);
    }
  };

  const handleDeleteSkill = async (
    skillId: string,
    skillName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingSkill === skillId) return;

    if (
      !confirm(
        `Are you sure you want to delete "${skillName}"? This will also delete all associated challenges.`
      )
    ) {
      return;
    }

    setDeletingSkill(skillId);
    try {
      await skillAPI.delete(skillId);
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete skill");
    } finally {
      setDeletingSkill(null);
    }
  };

  const saveSkillOrder = (newOrder: Skill[]) => {
    const orderIds = newOrder.map((skill) => skill._id);
    localStorage.setItem(`skillOrder-${categoryId}`, JSON.stringify(orderIds));
  };

  const handleDragStart = (skillId: string) => {
    setDraggedSkillId(skillId);
  };

  const handleDragOver = (e: React.DragEvent, skillId: string) => {
    e.preventDefault();
    if (draggedSkillId && draggedSkillId !== skillId) {
      setDragOverSkillId(skillId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSkillId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSkillId: string) => {
    e.preventDefault();
    if (!draggedSkillId || draggedSkillId === targetSkillId) {
      setDraggedSkillId(null);
      setDragOverSkillId(null);
      return;
    }

    const draggedIndex = skills.findIndex(
      (skill) => skill._id === draggedSkillId
    );
    const targetIndex = skills.findIndex(
      (skill) => skill._id === targetSkillId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSkills = [...skills];
    const [draggedItem] = newSkills.splice(draggedIndex, 1);
    newSkills.splice(targetIndex, 0, draggedItem);

    setSkills(newSkills);
    saveSkillOrder(newSkills);
    setDraggedSkillId(null);
    setDragOverSkillId(null);
  };

  const handleDragEnd = () => {
    setDraggedSkillId(null);
    setDragOverSkillId(null);
  };

  const handleEditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cat = localCategory || category;
    if (!cat) return;
    setEditingCategory(true);
    setEditCategoryName(cat.name);
    setEditCategoryDescription(cat.description || "");
    setCategoryMenuOpen(false);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = localCategory || category;
    if (!cat || !editCategoryName.trim() || updatingCategory) return;

    setUpdatingCategory(true);
    try {
      await categoryAPI.update(cat._id, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || undefined,
      });
      setEditingCategory(false);
      if (onCategoryUpdate) {
        onCategoryUpdate();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cat = localCategory || category;
    if (!cat || deletingCategory) return;

    if (
      !confirm(
        `Are you sure you want to delete "${cat.name}"? This will also delete all associated skills and challenges.`
      )
    ) {
      return;
    }

    setDeletingCategory(true);
    try {
      await categoryAPI.delete(cat._id);
      if (onCategoryDelete) {
        onCategoryDelete();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCategory(false);
    }
  };

  return (
    <div className="skills-list">
      <div className="section-header">
        <div className="header-title-section">
          {editingCategory ? (
            <form className="edit-form" onSubmit={handleUpdateCategory}>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                required
                autoFocus
              />
              <div className="edit-form-actions">
                <button
                  type="submit"
                  className="save-button"
                  disabled={updatingCategory}
                >
                  {updatingCategory ? <Spinner size="sm" /> : "Save"}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditingCategory(false)}
                  disabled={updatingCategory}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <h2>{localCategory?.name || category?.name || "Skills"}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                  <button
                    className="add-button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    title="Add skill"
                    disabled={
                      creatingSkill ||
                      !!updatingSkill ||
                      !!deletingSkill ||
                      editingCategory
                    }
                  >
                    +
                  </button>
                  <div
                    className="skill-menu-container"
                    ref={categoryMenuRef}
                    onMouseEnter={() => {
                      if (menuCloseTimeout) {
                        clearTimeout(menuCloseTimeout);
                        setMenuCloseTimeout(null);
                      }
                    }}
                    onMouseLeave={() => {
                      if (categoryMenuOpen) {
                        const timeout = setTimeout(() => {
                          setCategoryMenuOpen(false);
                        }, 300);
                        setMenuCloseTimeout(timeout);
                      }
                    }}
                  >
                    <button
                      className="skill-menu-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryMenuOpen(!categoryMenuOpen);
                      }}
                      title="More options"
                      disabled={
                        deletingCategory || updatingCategory || editingCategory
                      }
                    >
                      ⋯
                    </button>
                    {categoryMenuOpen && (
                      <div
                        className="skill-menu"
                        onMouseEnter={() => {
                          if (menuCloseTimeout) {
                            clearTimeout(menuCloseTimeout);
                            setMenuCloseTimeout(null);
                          }
                        }}
                        onMouseLeave={() => {
                          if (categoryMenuOpen) {
                            const timeout = setTimeout(() => {
                              setCategoryMenuOpen(false);
                            }, 300);
                            setMenuCloseTimeout(timeout);
                          }
                        }}
                      >
                        <button
                          className="skill-menu-item"
                          onClick={handleEditCategory}
                          disabled={
                            deletingCategory ||
                            updatingCategory ||
                            editingCategory
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="skill-menu-item delete"
                          onClick={handleDeleteCategory}
                          disabled={
                            deletingCategory ||
                            updatingCategory ||
                            editingCategory
                          }
                        >
                          {deletingCategory ? <Spinner size="sm" /> : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={handleCreateSkill}>
          <input
            type="text"
            placeholder="Skill name *"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            required
            autoFocus
          />
          {/* <input
            type="text"
            placeholder="Description (optional)"
            value={newSkillDescription}
            onChange={(e) => setNewSkillDescription(e.target.value)}
          /> */}
          <div className="form-actions">
            <button type="submit" disabled={creatingSkill}>
              {creatingSkill ? (
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
              disabled={creatingSkill}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading">
          <Spinner size="md" />
          <span>Loading skills...</span>
        </div>
      ) : skills.length === 0 ? (
        <div className="empty-state">
          No skills yet. Create your first skill!
        </div>
      ) : (
        <ul className="skill-list">
          {skills.map((skill) => (
            <li
              key={skill._id}
              className={`skill-item ${
                draggedSkillId === skill._id ? "dragging" : ""
              } ${dragOverSkillId === skill._id ? "drag-over" : ""}`}
              draggable={editingSkillId !== skill._id}
              onDragStart={() => handleDragStart(skill._id)}
              onDragOver={(e) => handleDragOver(e, skill._id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, skill._id)}
              onDragEnd={handleDragEnd}
              onClick={() => onSkillSelect(skill._id)}
              onMouseLeave={(e) => {
                if (openMenuId === skill._id) {
                  // Check if mouse is moving to the menu
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (
                    !relatedTarget ||
                    !relatedTarget.closest(".skill-menu-container")
                  ) {
                    // Add a small delay to allow moving to the menu
                    const timeout = setTimeout(() => {
                      setOpenMenuId(null);
                    }, 150);
                    setMenuCloseTimeout(timeout);
                  }
                }
              }}
              onMouseEnter={() => {
                // Clear any pending close timeout when hovering back
                if (menuCloseTimeout) {
                  clearTimeout(menuCloseTimeout);
                  setMenuCloseTimeout(null);
                }
              }}
            >
              {editingSkillId === skill._id ? (
                <form
                  className="edit-form"
                  onSubmit={(e) => handleUpdateSkill(skill._id, e)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editSkillName}
                    onChange={(e) => setEditSkillName(e.target.value)}
                    required
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="edit-form-actions">
                    <button
                      type="submit"
                      className="save-button"
                      disabled={updatingSkill === skill._id}
                    >
                      {updatingSkill === skill._id ? (
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
                      onClick={() => setEditingSkillId(null)}
                      disabled={updatingSkill === skill._id}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="skill-content">
                    <div className="skill-header">
                      <div className="skill-name">{skill.name}</div>
                      <div className="skill-stats">
                        <span className="skill-stat">
                          <span className="stat-label">XP:</span>
                          <span className="stat-value">{skill.xp || 0}</span>
                        </span>
                        <span className="skill-stat">
                          <span className="stat-label">LV:</span>
                          <span className="stat-value">{skill.level || 1}</span>
                        </span>
                        <div
                          className="skill-menu-container"
                          onMouseEnter={() => {
                            // Clear any pending close timeout when hovering over menu
                            if (menuCloseTimeout) {
                              clearTimeout(menuCloseTimeout);
                              setMenuCloseTimeout(null);
                            }
                          }}
                          onMouseLeave={() => {
                            // Close menu when leaving the menu container
                            if (openMenuId === skill._id) {
                              setOpenMenuId(null);
                            }
                          }}
                        >
                          <button
                            className="skill-menu-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === skill._id ? null : skill._id
                              );
                            }}
                            title="More options"
                          >
                            ⋯
                          </button>
                          {openMenuId === skill._id && (
                            <div className="skill-menu">
                              <button
                                className="skill-menu-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSkill(skill, e);
                                  setOpenMenuId(null);
                                }}
                                disabled={
                                  deletingSkill === skill._id ||
                                  updatingSkill === skill._id
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="skill-menu-item delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSkill(skill._id, skill.name, e);
                                  setOpenMenuId(null);
                                }}
                                disabled={
                                  deletingSkill === skill._id ||
                                  updatingSkill === skill._id
                                }
                              >
                                {deletingSkill === skill._id ? (
                                  <>
                                    <Spinner size="sm" />
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {skill.description && (
                      <div className="skill-description">
                        {skill.description}
                      </div>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
