import React from "react";

/**
 * Converts URLs in text to clickable links
 * @param text - The text to process
 * @returns JSX element with clickable links
 */
export function linkifyText(text: string): React.ReactNode {
  if (!text) {
    return text;
  }

  // URL regex pattern - matches http://, https://, and www. URLs
  // Also handles common trailing punctuation (., !, ?, ), etc.)
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:[a-zA-Z]{2,})(?:\/[^\s<>"']*)?)/gi;
  
  const parts: (string | { type: "url"; url: string; display: string })[] = [];
  let lastIndex = 0;
  let match;

  // Find all URLs in the text
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Process the URL
    let url = match[0];
    let displayUrl = url;

    // Remove trailing punctuation that shouldn't be part of the URL
    const trailingPunctuation = /[.,!?;:)\]}>]+$/;
    const punctuationMatch = url.match(trailingPunctuation);
    if (punctuationMatch) {
      // Only remove if it's clearly trailing punctuation (not part of the URL path)
      // Keep punctuation if it's in the middle of the URL
      const beforePunct = url.slice(0, -punctuationMatch[0].length);
      // Check if the punctuation is likely part of the URL (e.g., /path/to/file.html)
      if (!beforePunct.match(/\/[^\/]*$/)) {
        url = beforePunct;
        displayUrl = beforePunct;
      }
    }

    // Add protocol if missing (for www. URLs and domain-only URLs)
    if (url.startsWith("www.")) {
      url = `https://${url}`;
    } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
      // If it looks like a domain but doesn't have a protocol, add https://
      if (url.match(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:[a-zA-Z]{2,})/)) {
        url = `https://${url}`;
      }
    }

    // Truncate long URLs for display (optional, but helpful)
    if (displayUrl.length > 50) {
      displayUrl = displayUrl.substring(0, 47) + "...";
    }

    parts.push({ type: "url", url, display: displayUrl });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no URLs were found, return the original text
  if (parts.length === 1 && typeof parts[0] === "string") {
    return text;
  }

  // Render parts with links
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return <span key={index}>{part}</span>;
        } else {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="challenge-description-link"
              onClick={(e) => {
                // Prevent event bubbling to parent elements
                e.stopPropagation();
              }}
            >
              {part.display}
            </a>
          );
        }
      })}
    </>
  );
}

