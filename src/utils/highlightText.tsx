import React from "react";

/**
 * Highlights matching text in a string
 * @param text - The text to search in
 * @param query - The search query
 * @returns JSX element with highlighted text
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches the query (case-insensitive)
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark key={index} className="search-highlight">
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
