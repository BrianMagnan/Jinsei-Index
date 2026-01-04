import { useState, useEffect, useRef } from "react";
import { categoryAPI, skillAPI, challengeAPI } from "../services/api";
import type { Category, Skill, Challenge } from "../types";
import { type SearchResult } from "./Search";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { useDebounce } from "../hooks/useDebounce";
import { highlightText } from "../utils/highlightText";
import { hapticFeedback } from "../utils/haptic";
import "../App.css";

const RECENT_SEARCHES_KEY = "recentSearches";
const MAX_RECENT_SEARCHES = 10;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;

  const recent = getRecentSearches();
  const filtered = recent.filter(
    (q) => q.toLowerCase() !== query.toLowerCase()
  );
  const updated = [query.trim(), ...filtered].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelect: (categoryId: string | null) => void;
  onSkillSelect?: (skillId: string, categoryId: string) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  onCategorySelect,
  onSkillSelect,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query to reduce computation
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Swipe gesture state for closing modal
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      loadAllData();
      setRecentSearches(getRecentSearches());
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [cats, skills, challenges] = await Promise.all([
        categoryAPI.getAll(),
        skillAPI.getAll(),
        challengeAPI.getAll(),
      ]);
      setCategories(cats);
      setAllSkills(skills);
      setAllChallenges(challenges);
    } catch (err) {
      console.error("Failed to load data for search:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSearchResults = (): SearchResult[] => {
    if (!debouncedSearchQuery.trim()) return [];

    const query = debouncedSearchQuery.toLowerCase();
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

  const handleSelect = (result: SearchResult) => {
    hapticFeedback.selection();
    saveRecentSearch(searchQuery);

    if (result.type === "category") {
      onCategorySelect(result._id);
    } else if (result.type === "skill" && result.categoryId) {
      onCategorySelect(result.categoryId);
      if (onSkillSelect) {
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
        setTimeout(() => {
          onSkillSelect(result.skillId!, result.categoryId!);
        }, 100);
      }
    }

    onClose();
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Swipe gesture handlers for closing modal
  const minSwipeDistance = 100; // Minimum distance in pixels to trigger swipe

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceY = touchStart.y - touchEnd.y;
    const distanceX = touchStart.x - touchEnd.x;
    const isDownSwipe = distanceY < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    // Only handle vertical swipes down (ignore horizontal and upward swipes)
    if (isVerticalSwipe && isDownSwipe) {
      hapticFeedback.light();
      onClose();
    }
  };

  const results = getSearchResults();
  const isSearching = searchQuery.trim() !== "" && searchQuery !== debouncedSearchQuery;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="search-modal-overlay"
        onClick={() => {
          hapticFeedback.light();
          onClose();
        }}
      />
      <div
        className="search-modal"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="search-modal-header">
          <h2>Search</h2>
          <button
            className="search-modal-close"
            onClick={() => {
              hapticFeedback.light();
              onClose();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="search-modal-input-container">
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search categories, skills, and challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="search-modal-content">
          {loading || isSearching ? (
            <div className="search-modal-loading">
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <Skeleton
                  width="100%"
                  height="60px"
                  className="skeleton-line"
                />
              </div>
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <Skeleton
                  width="100%"
                  height="60px"
                  className="skeleton-line"
                />
              </div>
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <Skeleton
                  width="100%"
                  height="60px"
                  className="skeleton-line"
                />
              </div>
              <Skeleton width="80%" height="60px" className="skeleton-line" />
            </div>
          ) : debouncedSearchQuery.trim() === "" ? (
            <div className="search-modal-recent">
              {recentSearches.length > 0 ? (
                <>
                  <div className="search-modal-recent-header">
                    <h3>Recent Searches</h3>
                    <button
                      className="search-modal-clear-recent"
                      onClick={handleClearRecent}
                      title="Clear recent searches"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="search-modal-recent-list">
                    {recentSearches.map((query, index) => (
                      <li
                        key={index}
                        className="search-modal-recent-item"
                        onClick={() => {
                          hapticFeedback.light();
                          handleRecentSearchClick(query);
                        }}
                      >
                        <span className="search-modal-recent-icon">🕐</span>
                        <span className="search-modal-recent-query">
                          {query}
                        </span>
                        <button
                          className="search-modal-recent-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            hapticFeedback.light();
                            const updated = recentSearches.filter((_, i) => i !== index);
                            setRecentSearches(updated);
                            localStorage.setItem(
                              RECENT_SEARCHES_KEY,
                              JSON.stringify(updated)
                            );
                          }}
                          title="Remove from history"
                          aria-label="Remove from history"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyState
                  icon="🔍"
                  title="Start Searching"
                  message="Type to search across categories, skills, and challenges"
                  className="search-empty-state"
                />
              )}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon="🔎"
              title="No Results Found"
              message={`No categories, skills, or challenges match "${debouncedSearchQuery}". Try a different search term.`}
              className="search-empty-state"
            />
          ) : (
            <ul className="search-modal-results-list">
              {results.map((result) => (
                <li
                  key={`${result.type}-${result._id}`}
                  className="search-modal-result-item"
                  onClick={() => handleSelect(result)}
                >
                  <div className="search-modal-result-content">
                    <div className="search-modal-result-header">
                      <span className="search-modal-result-name">
                        {highlightText(result.name, debouncedSearchQuery)}
                      </span>
                      <span
                        className={`search-modal-result-type search-modal-result-type-${result.type}`}
                      >
                        {result.type}
                      </span>
                    </div>
                    {result.categoryName && (
                      <div className="search-modal-result-path">
                        {highlightText(result.categoryName, debouncedSearchQuery)}
                        {result.skillName && (
                          <>
                            {" > "}
                            {highlightText(result.skillName, debouncedSearchQuery)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
