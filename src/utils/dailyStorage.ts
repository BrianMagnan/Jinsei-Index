import type { DailyItem } from "../types";

const DAILY_STORAGE_KEY = "jinseiDailyList";

/**
 * Get all daily items from localStorage
 */
export function getDailyItems(): DailyItem[] {
  try {
    const stored = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save daily items to localStorage
 */
export function saveDailyItems(items: DailyItem[]): void {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save daily items:", error);
  }
}

/**
 * Add a challenge to the daily list
 */
export function addDailyItem(item: Omit<DailyItem, "addedAt" | "completed" | "completedAt">): DailyItem {
  const items = getDailyItems();
  
  // Check if item already exists (even if completed)
  const existingIndex = items.findIndex(
    (i) => i.challengeId === item.challengeId
  );
  
  if (existingIndex !== -1) {
    // Item already exists, return it
    return items[existingIndex];
  }
  
  const newItem: DailyItem = {
    ...item,
    addedAt: new Date().toISOString(),
    completed: false,
  };
  
  items.push(newItem);
  saveDailyItems(items);
  return newItem;
}

/**
 * Toggle completion status of a daily item
 * Items persist after being checked off (unlike todo list)
 */
export function toggleDailyItem(challengeId: string): DailyItem | null {
  const items = getDailyItems();
  const item = items.find((i) => i.challengeId === challengeId);
  
  if (!item) return null;
  
  item.completed = !item.completed;
  item.completedAt = item.completed ? new Date().toISOString() : undefined;
  
  saveDailyItems(items);
  return item;
}

/**
 * Check if a challenge is in the daily list
 */
export function isInDailyList(challengeId: string): boolean {
  const items = getDailyItems();
  return items.some((item) => item.challengeId === challengeId);
}

/**
 * Remove a daily item from the list (only for active items, not completed)
 */
export function removeDailyItem(challengeId: string): void {
  const items = getDailyItems();
  const item = items.find((i) => i.challengeId === challengeId);
  
  // Only allow removal of non-completed items
  if (item && !item.completed) {
    const filtered = items.filter((item) => item.challengeId !== challengeId);
    saveDailyItems(filtered);
  }
}

