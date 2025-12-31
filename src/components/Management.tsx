import { useState, useEffect } from "react";
import {
  categoryAPI,
  skillAPI,
  subSkillAPI,
  challengeAPI,
} from "../services/api";
import { CategoryForm } from "./CategoryForm";
import { SkillForm } from "./SkillForm";
import { SubSkillForm } from "./SubSkillForm";
import { ChallengeForm } from "./ChallengeForm";
import type { Category, Skill, SubSkill, Challenge } from "../types";

type ActiveForm = "category" | "skill" | "subskill" | "challenge" | null;
type EditMode = {
  type: ActiveForm;
  item: Category | Skill | SubSkill | Challenge;
} | null;

export function Management() {
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subSkills, setSubSkills] = useState<SubSkill[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [catsData, skillsData, subSkillsData, challengesData] =
        await Promise.all([
          categoryAPI.getAll(),
          skillAPI.getAll(),
          subSkillAPI.getAll(),
          challengeAPI.getAll(),
        ]);
      setCategories(catsData);
      setSkills(skillsData);
      setSubSkills(subSkillsData);
      setChallenges(challengesData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadAll();
    setActiveForm(null);
    setEditMode(null);
  };

  const handleEdit = (
    type: ActiveForm,
    item: Category | Skill | SubSkill | Challenge
  ) => {
    setEditMode({ type, item });
    setActiveForm(type);
  };

  const handleDelete = async (
    type: "category" | "skill" | "subskill" | "challenge",
    id: string
  ) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      switch (type) {
        case "category":
          await categoryAPI.delete(id);
          break;
        case "skill":
          await skillAPI.delete(id);
          break;
        case "subskill":
          await subSkillAPI.delete(id);
          break;
        case "challenge":
          await challengeAPI.delete(id);
          break;
      }
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const getSkillName = (skillId: string) => {
    const skill = skills.find((s) => s._id === skillId);
    return skill?.name || "Unknown";
  };

  const getSubSkillName = (subSkillId: string) => {
    const subSkill = subSkills.find((s) => s._id === subSkillId);
    return subSkill?.name || "Unknown";
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c._id === categoryId);
    return category?.name || "Unknown";
  };

  if (loading) {
    return <div className="management-loading">Loading management data...</div>;
  }

  return (
    <div className="management">
      <div className="management-header">
        <h1>Management</h1>
        <p>
          Create and manage your Categories, Skills, SubSkills, and Challenges
        </p>
      </div>

      {/* Form Buttons */}
      <div className="management-actions">
        <button
          onClick={() => {
            setActiveForm("category");
            setEditMode(null);
          }}
        >
          + Create Category
        </button>
        <button
          onClick={() => {
            setActiveForm("skill");
            setEditMode(null);
          }}
        >
          + Create Skill
        </button>
        <button
          onClick={() => {
            setActiveForm("subskill");
            setEditMode(null);
          }}
        >
          + Create SubSkill
        </button>
        <button
          onClick={() => {
            setActiveForm("challenge");
            setEditMode(null);
          }}
        >
          + Create Challenge
        </button>
      </div>

      {/* Forms */}
      {activeForm === "category" && (
        <div className="management-form-section">
          <CategoryForm
            category={
              editMode?.type === "category"
                ? (editMode.item as Category)
                : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setActiveForm(null);
              setEditMode(null);
            }}
          />
        </div>
      )}

      {activeForm === "skill" && (
        <div className="management-form-section">
          <SkillForm
            skill={
              editMode?.type === "skill" ? (editMode.item as Skill) : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setActiveForm(null);
              setEditMode(null);
            }}
          />
        </div>
      )}

      {activeForm === "subskill" && (
        <div className="management-form-section">
          <SubSkillForm
            subSkill={
              editMode?.type === "subskill"
                ? (editMode.item as SubSkill)
                : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setActiveForm(null);
              setEditMode(null);
            }}
          />
        </div>
      )}

      {activeForm === "challenge" && (
        <div className="management-form-section">
          <ChallengeForm
            challenge={
              editMode?.type === "challenge"
                ? (editMode.item as Challenge)
                : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setActiveForm(null);
              setEditMode(null);
            }}
          />
        </div>
      )}

      {/* Lists */}
      <div className="management-lists">
        <div className="management-section">
          <h2>Categories ({categories.length})</h2>
          <div className="entity-list">
            {categories.map((cat) => (
              <div key={cat._id} className="entity-item">
                <div className="entity-info">
                  <strong>{cat.name}</strong>
                  {cat.description && (
                    <span className="entity-desc">{cat.description}</span>
                  )}
                  <span className="entity-meta">
                    Level {cat.level} • {cat.xp} XP
                  </span>
                </div>
                <div className="entity-actions">
                  <button onClick={() => handleEdit("category", cat)}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete("category", cat._id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="management-section">
          <h2>Skills ({skills.length})</h2>
          <div className="entity-list">
            {skills.map((skill) => (
              <div key={skill._id} className="entity-item">
                <div className="entity-info">
                  <strong>{skill.name}</strong>
                  {skill.description && (
                    <span className="entity-desc">{skill.description}</span>
                  )}
                  <span className="entity-meta">
                    {getCategoryName(
                      typeof skill.category === "object"
                        ? skill.category._id
                        : skill.category
                    )}{" "}
                    • Level {skill.level} • {skill.xp} XP
                  </span>
                </div>
                <div className="entity-actions">
                  <button onClick={() => handleEdit("skill", skill)}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete("skill", skill._id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="management-section">
          <h2>SubSkills ({subSkills.length})</h2>
          <div className="entity-list">
            {subSkills.map((subSkill) => (
              <div key={subSkill._id} className="entity-item">
                <div className="entity-info">
                  <strong>{subSkill.name}</strong>
                  {subSkill.description && (
                    <span className="entity-desc">{subSkill.description}</span>
                  )}
                  <span className="entity-meta">
                    {getSkillName(
                      typeof subSkill.skill === "object"
                        ? subSkill.skill._id
                        : subSkill.skill
                    )}
                  </span>
                </div>
                <div className="entity-actions">
                  <button onClick={() => handleEdit("subskill", subSkill)}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete("subskill", subSkill._id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="management-section">
          <h2>Challenges ({challenges.length})</h2>
          <div className="entity-list">
            {challenges.map((challenge) => (
              <div key={challenge._id} className="entity-item">
                <div className="entity-info">
                  <strong>{challenge.name}</strong>
                  {challenge.description && (
                    <span className="entity-desc">{challenge.description}</span>
                  )}
                  <span className="entity-meta">
                    {getSubSkillName(
                      typeof challenge.subSkill === "object"
                        ? challenge.subSkill._id
                        : challenge.subSkill
                    )}{" "}
                    • +{challenge.xpReward} XP
                  </span>
                </div>
                <div className="entity-actions">
                  <button onClick={() => handleEdit("challenge", challenge)}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete("challenge", challenge._id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
