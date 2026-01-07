import { useState, useEffect } from "react";
import { skillAPI, categoryAPI } from "../services/api";
import type { Skill, Category } from "../types";
import { Spinner } from "./Spinner";
import { Breadcrumbs } from "./Breadcrumbs";
import { SkillSkeletonList } from "./SkillSkeleton";
import { EmptyState } from "./EmptyState";
import { hapticFeedback } from "../utils/haptic";

interface SkillsListProps {
  categoryId: string;
  category: Category | null;
  onSkillSelect: (skillId: string) => void;
  onCategoryUpdate?: () => void;
  onCategoryDelete?: () => void;
  onBackToCategories?: () => void;
}

export function SkillsList({
  categoryId,
  category,
  onSkillSelect,
  onCategoryUpdate,
  onBackToCategories,
}: SkillsListProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const [dragOverSkillId, setDragOverSkillId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [localCategory, setLocalCategory] = useState<Category | null>(category);
  const [deletingSkill, setDeletingSkill] = useState<string | null>(null);

  // Swipe gesture state for skill list items
  const [itemSwipeStart, setItemSwipeStart] = useState<{
    x: number;
    y: number;
    skillId: string;
  } | null>(null);
  const [itemSwipeEnd, setItemSwipeEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [swipedSkillId, setSwipedSkillId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

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

  useEffect(() => {
    loadSkills();
  }, [categoryId]);

  useEffect(() => {
    setLocalCategory(category);
  }, [category]);

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
      hapticFeedback.success();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreatingSkill(false);
    }
  };

  const handleEditSkill = (skill: Skill, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    hapticFeedback.light();
    setEditingSkillId(skill._id);
    setEditSkillName(skill.name);
  };

  const handleUpdateSkill = async (skillId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (updatingSkill === skillId) return;

    hapticFeedback.medium();
    setUpdatingSkill(skillId);
    try {
      await skillAPI.update(skillId, {
        name: editSkillName.trim(),
      });
      setEditingSkillId(null);
      await loadSkills();
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to update skill");
    } finally {
      setUpdatingSkill(null);
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

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = localCategory || category;
    if (!cat || !editCategoryName.trim() || updatingCategory) return;

    setUpdatingCategory(true);
    try {
      await categoryAPI.update(cat._id, {
        name: editCategoryName.trim(),
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

  const handleDeleteSkill = async (
    skillId: string,
    skillName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (deletingSkill === skillId) return;

    hapticFeedback.medium();
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
      hapticFeedback.success();
    } catch (err) {
      hapticFeedback.error();
      alert(err instanceof Error ? err.message : "Failed to delete skill");
    } finally {
      setDeletingSkill(null);
    }
  };

  return (
    <div className="skills-list">
      <Breadcrumbs
        category={localCategory || category}
        skill={null}
        onCategoriesClick={onBackToCategories}
        onCategoryClick={undefined}
      />
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
            <h2>{localCategory?.name || category?.name || "Skills"}</h2>
          )}
        </div>
      </div>

      {loading ? (
        <ul className="skill-list">
          <SkillSkeletonList count={5} />
        </ul>
      ) : skills.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No Skills Yet"
          message="Skills help you track your progress in different areas. Add your first skill to start building your journey!"
          actionLabel="Add Skill"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <ul className="skill-list">
          {skills.map((skill) => (
            <li
              key={skill._id}
              className={`skill-item ${
                draggedSkillId === skill._id ? "dragging" : ""
              } ${dragOverSkillId === skill._id ? "drag-over" : ""} ${
                swipedSkillId === skill._id ? "swiping" : ""
              }`}
              draggable={true}
              onDragStart={() => handleDragStart(skill._id)}
              onDragOver={(e) => handleDragOver(e, skill._id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, skill._id)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                onSkillSelect(skill._id);
              }}
              onTouchStart={(e) => {
                setItemSwipeStart({
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY,
                  skillId: skill._id,
                });
                setItemSwipeEnd(null);
                setSwipeOffset(0);
              }}
              onTouchMove={(e) => {
                if (itemSwipeStart && itemSwipeStart.skillId === skill._id) {
                  const currentX = e.touches[0].clientX;
                  const currentY = e.touches[0].clientY;
                  setItemSwipeEnd({ x: currentX, y: currentY });

                  // Calculate swipe offset for visual feedback
                  const deltaX = currentX - itemSwipeStart.x;
                  const deltaY = Math.abs(currentY - itemSwipeStart.y);

                  // Only allow horizontal swipes (ignore if vertical movement is too large)
                  if (deltaY < 30) {
                    setSwipeOffset(deltaX);
                    setSwipedSkillId(skill._id);
                  }
                }
              }}
              onTouchEnd={() => {
                if (
                  itemSwipeStart &&
                  itemSwipeStart.skillId === skill._id &&
                  itemSwipeEnd
                ) {
                  const deltaX = itemSwipeEnd.x - itemSwipeStart.x;
                  const deltaY = Math.abs(itemSwipeEnd.y - itemSwipeStart.y);
                  const minSwipeDistance = 80;

                  // Only handle horizontal swipes
                  if (deltaY < 50 && Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX < 0) {
                      // Swipe left - delete
                      hapticFeedback.medium();
                      if (confirm(`Delete "${skill.name}"?`)) {
                        handleDeleteSkill(skill._id, skill.name, {
                          stopPropagation: () => {},
                        } as React.MouseEvent);
                      }
                    }
                  }
                }

                // Reset swipe state
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedSkillId(null);
                setSwipeOffset(0);
              }}
              onTouchCancel={() => {
                setItemSwipeStart(null);
                setItemSwipeEnd(null);
                setSwipedSkillId(null);
                setSwipeOffset(0);
              }}
              style={{
                transform:
                  swipedSkillId === skill._id
                    ? `translateX(${Math.max(
                        -100,
                        Math.min(100, swipeOffset)
                      )}px)`
                    : undefined,
                transition:
                  swipedSkillId === skill._id
                    ? "none"
                    : "transform 0.2s ease-out",
              }}
            >
              <>
                <div className="skill-content">
                  <div className="skill-header">
                    <div className="skill-name">{skill.name}</div>
                  </div>
                  {skill.description && (
                    <div className="skill-description">{skill.description}</div>
                  )}
                  {/* Swipe action indicators */}
                  {swipedSkillId === skill._id && (
                    <>
                      {swipeOffset < 0 && (
                        <div className="challenge-swipe-indicator swipe-delete">
                          <span className="swipe-icon">🗑️</span>
                          <span className="swipe-text">Delete</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSkill(skill, e);
                  }}
                  title="Edit skill"
                  disabled={
                    deletingSkill === skill._id || updatingSkill === skill._id
                  }
                >
                  ✎
                </button>
              </>
            </li>
          ))}
        </ul>
      )}

      <div className="categories-list-footer">
        <button
          className="add-button"
          onClick={() => {
            hapticFeedback.light();
            setShowAddForm(true);
          }}
          title="Add skill"
        >
          +
        </button>
      </div>

      {/* Add Skill Modal */}
      {showAddForm && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setShowAddForm(false);
          }}
        >
          <div
            className="challenge-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="challenge-action-modal-header">
              <h3>Add Skill</h3>
              <button
                className="challenge-action-modal-close"
                onClick={() => {
                  hapticFeedback.light();
                  setShowAddForm(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className="edit-form" onSubmit={handleCreateSkill}>
              <div className="auth-field">
                <label htmlFor="new-skill-name">Name *</label>
                <input
                  id="new-skill-name"
                  type="text"
                  placeholder="Skill name"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="edit-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    hapticFeedback.light();
                    setShowAddForm(false);
                  }}
                  disabled={creatingSkill}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={creatingSkill}
                >
                  {creatingSkill ? (
                    <>
                      <Spinner size="sm" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {editingSkillId && (
        <div
          className="challenge-edit-modal-overlay"
          onClick={() => {
            hapticFeedback.light();
            setEditingSkillId(null);
          }}
        >
          <div
            className="challenge-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const skill = skills.find((s) => s._id === editingSkillId);
              if (!skill) return null;

              return (
                <>
                  <div className="challenge-action-modal-header">
                    <h3>Edit Skill</h3>
                    <button
                      className="challenge-action-modal-close"
                      onClick={() => {
                        hapticFeedback.light();
                        setEditingSkillId(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form
                    className="edit-form"
                    onSubmit={(e) => handleUpdateSkill(skill._id, e)}
                  >
                    <div className="auth-field">
                      <label htmlFor="edit-skill-name">Name *</label>
                      <input
                        id="edit-skill-name"
                        type="text"
                        value={editSkillName}
                        onChange={(e) => setEditSkillName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="edit-form-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                          hapticFeedback.light();
                          setEditingSkillId(null);
                        }}
                        disabled={updatingSkill === skill._id}
                      >
                        Cancel
                      </button>
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
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
