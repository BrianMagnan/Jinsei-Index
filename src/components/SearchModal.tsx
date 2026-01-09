import { useState, useEffect, useRef } from "react";
import { categoryAPI, skillAPI, challengeAPI, achievementAPI } from "../services/api";
import type { Category, Skill, Challenge, Achievement } from "../types";
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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filterType, setFilterType] = useState<"all" | "category" | "skill" | "challenge">("all");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSkill, setFilterSkill] = useState<string | null>(null);
  const [filterCompletion, setFilterCompletion] = useState<"all" | "completed" | "not-completed">("all");
  
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
      setShowFilters(false);
      // Reset filters when closing
      setFilterType("all");
      setFilterCategory(null);
      setFilterSkill(null);
      setFilterCompletion("all");
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
      const [cats, skills, challenges, achievementsData] = await Promise.all([
        categoryAPI.getAll(),
        skillAPI.getAll(),
        challengeAPI.getAll(),
        achievementAPI.getAll().catch(() => []), // Fail silently if achievements can't be loaded
      ]);
      setCategories(cats);
      setAllSkills(skills);
      setAllChallenges(challenges);
      setAchievements(achievementsData || []);
    } catch (err) {
      console.error("Failed to load data for search:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Get completed challenge IDs - memoized
  const completedChallengeIds = new Set(
    achievements.map((a) => {
      const challengeId = typeof a.challenge === "string" ? a.challenge : a.challenge._id;
      return challengeId;
    })
  );

  const getSearchResults = (): SearchResult[] => {
    if (!debouncedSearchQuery.trim()) return [];

    const query = debouncedSearchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search categories
    if (filterType === "all" || filterType === "category") {
      categories.forEach((category) => {
        // Apply category filter
        if (filterCategory && category._id !== filterCategory) return;
        
        if (category.name.toLowerCase().includes(query)) {
          results.push({
            _id: category._id,
            name: category.name,
            type: "category",
          });
        }
      });
    }

    // Search skills
    if (filterType === "all" || filterType === "skill") {
      allSkills.forEach((skill) => {
        const categoryId =
          typeof skill.category === "string"
            ? skill.category
            : skill.category._id;
        
        // Apply filters
        if (filterCategory && categoryId !== filterCategory) return;
        if (filterSkill && skill._id !== filterSkill) return;
        
        if (skill.name.toLowerCase().includes(query)) {
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
    }

    // Search challenges
    if (filterType === "all" || filterType === "challenge") {
      allChallenges.forEach((challenge) => {
        const challengeId = challenge._id;
        const skillId =
          typeof challenge.skill === "string"
            ? challenge.skill
            : challenge.skill._id;
        const skill =
          typeof challenge.skill === "string"
            ? allSkills.find((s) => s._id === skillId)
            : challenge.skill;

        if (!skill) return;
        
        const categoryId =
          typeof skill.category === "string"
            ? skill.category
            : skill.category._id;
        
        // Apply filters
        if (filterCategory && categoryId !== filterCategory) return;
        if (filterSkill && skillId !== filterSkill) return;
        
        // Apply completion filter
        const isCompleted = completedChallengeIds.has(challengeId);
        if (filterCompletion === "completed" && !isCompleted) return;
        if (filterCompletion === "not-completed" && isCompleted) return;
        
        if (challenge.name.toLowerCase().includes(query)) {
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
            completed: isCompleted,
          });
        }
      });
    }

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
  
  const handleClearFilters = () => {
    hapticFeedback.light();
    setFilterType("all");
    setFilterCategory(null);
    setFilterSkill(null);
    setFilterCompletion("all");
  };
  
  const hasActiveFilters = filterType !== "all" || filterCategory !== null || filterSkill !== null || filterCompletion !== "all";

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
          <div className="search-modal-actions">
            <button
              className={`search-modal-action-button ${showFilters ? "active" : ""}`}
              onClick={() => {
                hapticFeedback.light();
                setShowFilters(!showFilters);
              }}
              title="Filters"
            >
              <span className="button-icon">🔍</span>
              {hasActiveFilters && <span className="filter-badge" />}
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="search-modal-filters">
            <div className="search-modal-filters-header">
              <h3>Filters</h3>
              {hasActiveFilters && (
                <button
                  className="search-modal-clear-filters"
                  onClick={handleClearFilters}
                  title="Clear all filters"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="search-modal-filters-content">
              <div className="search-filter-group">
                <label className="search-filter-label">Type</label>
                <div className="search-filter-options">
                  {(["all", "category", "skill", "challenge"] as const).map((type) => (
                    <button
                      key={type}
                      className={`search-filter-option ${filterType === type ? "active" : ""}`}
                      onClick={() => {
                        hapticFeedback.light();
                        setFilterType(type);
                      }}
                    >
                      {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="search-filter-group">
                <label className="search-filter-label">Category</label>
                <select
                  className="search-filter-select"
                  value={filterCategory || ""}
                  onChange={(e) => {
                    hapticFeedback.light();
                    setFilterCategory(e.target.value || null);
                    setFilterSkill(null); // Reset skill when category changes
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {filterCategory && (
                <div className="search-filter-group">
                  <label className="search-filter-label">Skill</label>
                  <select
                    className="search-filter-select"
                    value={filterSkill || ""}
                    onChange={(e) => {
                      hapticFeedback.light();
                      setFilterSkill(e.target.value || null);
                    }}
                  >
                    <option value="">All Skills</option>
                    {allSkills
                      .filter((skill) => {
                        const categoryId = typeof skill.category === "string" ? skill.category : skill.category._id;
                        return categoryId === filterCategory;
                      })
                      .map((skill) => (
                        <option key={skill._id} value={skill._id}>
                          {skill.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
              {(filterType === "all" || filterType === "challenge") && (
                <div className="search-filter-group">
                  <label className="search-filter-label">Completion Status</label>
                  <div className="search-filter-options">
                    {(["all", "completed", "not-completed"] as const).map((status) => (
                      <button
                        key={status}
                        className={`search-filter-option ${filterCompletion === status ? "active" : ""}`}
                        onClick={() => {
                          hapticFeedback.light();
                          setFilterCompletion(status);
                        }}
                      >
                        {status === "all" ? "All" : status === "completed" ? "Completed" : "Not Completed"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
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
          ) : debouncedSearchQuery.trim() === "" && !showFilters ? (
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
          ) : debouncedSearchQuery.trim() !== "" && results.length === 0 ? (
            <EmptyState
              icon="🔎"
              title="No Results Found"
              message={`No results match "${debouncedSearchQuery}"${hasActiveFilters ? " with current filters" : ""}. Try adjusting your search or filters.`}
              className="search-empty-state"
            />
          ) : debouncedSearchQuery.trim() !== "" ? (
            <>
              {hasActiveFilters && (
                <div className="search-modal-results-header">
                  <span className="search-modal-results-count">
                    {results.length} result{results.length !== 1 ? "s" : ""} found
                  </span>
                </div>
              )}
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
                        <div className="search-modal-result-badges">
                          <span
                            className={`search-modal-result-type search-modal-result-type-${result.type}`}
                          >
                            {result.type}
                          </span>
                          {result.completed && (
                            <span className="search-modal-result-completed" title="Completed">
                              ✓
                            </span>
                          )}
                        </div>
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
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
