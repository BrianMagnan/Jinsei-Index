import { useEffect, useState } from "react";
import { categoryAPI, achievementAPI } from "../services/api";
import type { CategoryWithHierarchy, Challenge } from "../types";
import { XPBar } from "./XPBar";

export function SkillTree() {
  const [categories, setCategories] = useState<CategoryWithHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();

      // Load full hierarchy for each category
      const categoriesWithHierarchy = await Promise.all(
        data.map(async (cat: any) => {
          const fullCategory = await categoryAPI.getById(cat._id);
          return fullCategory;
        })
      );

      setCategories(categoriesWithHierarchy);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load skill tree"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCompleteChallenge = async (challenge: Challenge) => {
    try {
      await achievementAPI.create({ challenge: challenge._id });
      // Reload categories to show updated XP/levels
      await loadCategories();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to complete challenge"
      );
    }
  };

  if (loading) {
    return <div className="skill-tree-loading">Loading skill tree...</div>;
  }

  if (error) {
    return <div className="skill-tree-error">Error: {error}</div>;
  }

  return (
    <div className="skill-tree">
      <h1>Skill Tree</h1>
      <div className="tree-container">
        {categories.map((category) => (
          <div key={category._id} className="tree-category">
            <div
              className="category-header"
              onClick={() => toggleCategory(category._id)}
            >
              <h2>{category.name}</h2>
              <div className="category-stats">
                <span>Level {category.level}</span>
                <span>{category.xp.toLocaleString()} XP</span>
              </div>
              <span className="expand-icon">
                {expandedCategories.has(category._id) ? "▼" : "▶"}
              </span>
            </div>

            {expandedCategories.has(category._id) && (
              <div className="category-content">
                <XPBar
                  currentXP={category.xp}
                  level={category.level}
                  xpPerLevel={200}
                />

                {category.skills?.map((skill) => (
                  <div key={skill._id} className="tree-skill">
                    <h3>{skill.name}</h3>
                    <div className="skill-stats">
                      <span>Level {skill.level}</span>
                      <span>{skill.xp.toLocaleString()} XP</span>
                    </div>
                    <XPBar
                      currentXP={skill.xp}
                      level={skill.level}
                      xpPerLevel={100}
                    />

                    {skill.subSkills?.map((subSkill) => (
                      <div key={subSkill._id} className="tree-subskill">
                        <h4>{subSkill.name}</h4>

                        {subSkill.challenges?.map((challenge) => (
                          <div key={challenge._id} className="tree-challenge">
                            <div className="challenge-info">
                              <span className="challenge-name">
                                {challenge.name}
                              </span>
                              <span className="challenge-xp">
                                +{challenge.xpReward} XP
                              </span>
                            </div>
                            <button
                              className="complete-button"
                              onClick={() => handleCompleteChallenge(challenge)}
                            >
                              Complete
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
