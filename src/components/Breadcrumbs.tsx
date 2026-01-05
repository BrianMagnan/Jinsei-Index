import type { Category, Skill, Challenge } from "../types";
import "../App.css";

interface BreadcrumbsProps {
  category: Category | null;
  skill: Skill | null;
  challenge?: Challenge | null;
  onCategoriesClick?: () => void;
  onCategoryClick?: () => void;
  onSkillClick?: () => void;
  onChallengeClick?: () => void;
}

export function Breadcrumbs({
  category,
  skill,
  challenge,
  onCategoriesClick,
  onCategoryClick,
  onSkillClick,
  onChallengeClick,
}: BreadcrumbsProps) {
  // Show breadcrumbs if we have category/skill/challenge OR if onCategoriesClick is undefined (categories page)
  if (!category && !skill && !challenge && onCategoriesClick !== undefined) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {onCategoriesClick ? (
          <>
            <li className="breadcrumb-item">
              <button
                className="breadcrumb-link"
                onClick={onCategoriesClick}
                type="button"
              >
                Categories
              </button>
            </li>
            {(category || skill || challenge) && (
              <li className="breadcrumb-separator" aria-hidden="true">
                ›
              </li>
            )}
          </>
        ) : !category && !skill && !challenge ? (
          <li className="breadcrumb-item">
            <span className="breadcrumb-current">Categories</span>
          </li>
        ) : null}
        {category && (
          <li className="breadcrumb-item">
            {onCategoryClick ? (
              <button
                className="breadcrumb-link"
                onClick={onCategoryClick}
                type="button"
              >
                {category.name}
              </button>
            ) : (
              <span className="breadcrumb-current">{category.name}</span>
            )}
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
