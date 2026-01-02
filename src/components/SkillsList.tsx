import { useState, useEffect } from "react";
import { skillAPI } from "../services/api";
import type { Skill } from "../types";

interface SkillsListProps {
  categoryId: string;
  categoryName: string;
  onSkillSelect: (skillId: string) => void;
}

export function SkillsList({
  categoryId,
  categoryName,
  onSkillSelect,
}: SkillsListProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillDescription, setEditSkillDescription] = useState("");
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const [dragOverSkillId, setDragOverSkillId] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, [categoryId]);

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

          // Add any new skills that aren't in the saved order
          const existingIds = new Set(orderArray);
          const newSkills = data.filter(
            (skill: Skill) => !existingIds.has(skill._id)
          );

          setSkills([...orderedSkills, ...newSkills]);
        } catch {
          setSkills(data);
        }
      } else {
        setSkills(data);
      }
    } catch (err) {
      console.error("Failed to load skills:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      await skillAPI.create({
        name: newSkillName.trim(),
        description: newSkillDescription.trim() || undefined,
        category: categoryId,
      });
      setNewSkillName("");
      setNewSkillDescription("");
      setShowAddForm(false);
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create skill");
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
    if (!editSkillName.trim()) return;

    try {
      await skillAPI.update(skillId, {
        name: editSkillName.trim(),
        description: editSkillDescription.trim() || undefined,
      });
      setEditingSkillId(null);
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update skill");
    }
  };

  const handleDeleteSkill = async (
    skillId: string,
    skillName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete "${skillName}"? This will also delete all associated challenges.`
      )
    ) {
      return;
    }

    try {
      await skillAPI.delete(skillId);
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete skill");
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

  return (
    <div className="skills-list">
      <div className="section-header">
        <h2>{categoryName || "Skills"}</h2>
        <button
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add skill"
        >
          +
        </button>
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
            <button type="submit">Add</button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading skills...</div>
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
                    <button type="submit" className="save-button">
                      Save
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => setEditingSkillId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="skill-content">
                    <div className="skill-name">{skill.name}</div>
                    {skill.description && (
                      <div className="skill-description">
                        {skill.description}
                      </div>
                    )}
                  </div>
                  <div className="skill-actions">
                    <button
                      className="edit-button"
                      onClick={(e) => handleEditSkill(skill, e)}
                      title="Edit skill"
                    >
                      ✎
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) =>
                        handleDeleteSkill(skill._id, skill.name, e)
                      }
                      title="Delete skill"
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
    </div>
  );
}
