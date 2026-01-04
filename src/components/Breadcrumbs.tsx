import type { Category, Skill, Challenge } from "../types";
import "../App.css";

interface BreadcrumbsProps {
  category: Category | null;
  skill: Skill | null;
  challenge?: Challenge | null;
  onCategoryClick?: () => void;
  onSkillClick?: () => void;
  onChallengeClick?: () => void;
}

export function Breadcrumbs({
  category,
  skill,
  challenge,
  onCategoryClick,
  onSkillClick,
  onChallengeClick,
}: BreadcrumbsProps) {
  if (!category && !skill && !challenge) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {category && (
          <li className="breadcrumb-item">
            <button
              className="breadcrumb-link"
              onClick={onCategoryClick}
              type="button"
            >
              {category.name}
            </button>
          </li>
        )}
        {skill && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              ›
            </li>
            <li className="breadcrumb-item">
              {onSkillClick ? (
                <button
                  className="breadcrumb-link"
                  onClick={onSkillClick}
                  type="button"
                >
                  {skill.name}
                </button>
              ) : (
                <span className="breadcrumb-current">{skill.name}</span>
              )}
            </li>
          </>
        )}
        {challenge && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              ›
            </li>
            <li className="breadcrumb-item">
              {onChallengeClick ? (
                <button
                  className="breadcrumb-link"
                  onClick={onChallengeClick}
                  type="button"
                >
                  {challenge.name}
                </button>
              ) : (
                <span className="breadcrumb-current">{challenge.name}</span>
              )}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
