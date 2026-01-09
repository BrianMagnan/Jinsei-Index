import { useEffect, useRef, useState } from "react";

export type SearchResultType = "category" | "skill" | "challenge";

export interface SearchResult {
  _id: string;
  name: string;
  type: SearchResultType;
  categoryId?: string;
  categoryName?: string;
  skillId?: string;
  skillName?: string;
  completed?: boolean;
  [key: string]: any;
}

interface SearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  emptyMessage?: string;
}

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
  // Remove if already exists
  const filtered = recent.filter(
    (q) => q.toLowerCase() !== query.toLowerCase()
  );
  // Add to beginning
  const updated = [query.trim(), ...filtered].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export function Search({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  results,
  onSelect,
  placeholder = "Search...",
  emptyMessage = "No results found",
}: SearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) {
      setRecentSearches(getRecentSearches());
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

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(searchQuery);
    onSelect(result);
    onClose();
  };

  const handleRecentSearchClick = (query: string) => {
    onSearchChange(query);
    // Close modal after setting the search query
    // User can reopen and see results if needed
    onClose();
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay, not on child elements
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="search-overlay"
      onClick={handleOverlayClick}
      onMouseDown={handleOverlayClick}
    >
      <div
        className="search-container"
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
      >
        <div
          className="search-header"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            className="search-input-field"
          />
          <button
            className="search-close-button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={stopPropagation}
            aria-label="Close search"
          >
            ×
          </button>
        </div>
        <div
          className="search-results"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {searchQuery.trim() === "" ? (
            <div className="search-recent-searches">
              {recentSearches.length > 0 ? (
                <>
                  <div className="search-recent-header">
                    <h3 className="search-recent-title">Recent Searches</h3>
                    <button
                      className="search-clear-recent"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearRecent();
                      }}
                      onMouseDown={stopPropagation}
                      title="Clear recent searches"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="search-recent-list">
                    {recentSearches.map((query, index) => (
                      <li
                        key={index}
                        className="search-recent-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecentSearchClick(query);
                        }}
                        onMouseDown={stopPropagation}
                      >
                        <span className="search-recent-icon">🔍</span>
                        <span className="search-recent-query">{query}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="search-empty-state">
                  <p>Start typing to search...</p>
                </div>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty-state">
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <ul className="search-results-list">
              {results.map((result) => (
                <li
                  key={`${result.type}-${result._id}`}
                  className="search-result-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(result);
                  }}
                  onMouseDown={stopPropagation}
                >
                  <div className="search-result-content">
                    <div className="search-result-header">
                      <span className="search-result-name">{result.name}</span>
                      <span
                        className={`search-result-type search-result-type-${result.type}`}
                      >
                        {result.type}
                      </span>
                    </div>
                    {result.categoryName && (
                      <div className="search-result-path">
                        {result.categoryName}
                        {result.skillName && ` > ${result.skillName}`}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
