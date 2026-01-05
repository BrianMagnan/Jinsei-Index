import type { TodoItem } from "../types";

const TODO_STORAGE_KEY = "jinseiTodoList";

/**
 * Get all todo items from localStorage
 */
export function getTodoItems(): TodoItem[] {
  try {
    const stored = localStorage.getItem(TODO_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save todo items to localStorage
 */
export function saveTodoItems(items: TodoItem[]): void {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save todo items:", error);
  }
}

/**
 * Add a challenge to the todo list
 */
export function addTodoItem(item: Omit<TodoItem, "addedAt">): TodoItem {
  const items = getTodoItems();
  
  // Check if item already exists
  const existingIndex = items.findIndex(
    (i) => i.challengeId === item.challengeId && !i.completed
  );
  
  if (existingIndex !== -1) {
    // Item already exists, return it
    return items[existingIndex];
  }
  
  const newItem: TodoItem = {
    ...item,
    addedAt: new Date().toISOString(),
    completed: false,
  };
  
  items.push(newItem);
  saveTodoItems(items);
  return newItem;
}

/**
 * Remove a todo item from the list
 */
export function removeTodoItem(challengeId: string): void {
  const items = getTodoItems();
  const filtered = items.filter((item) => item.challengeId !== challengeId);
  saveTodoItems(filtered);
}

/**
 * Toggle completion status of a todo item
 */
export function toggleTodoItem(challengeId: string): TodoItem | null {
  const items = getTodoItems();
  const item = items.find((i) => i.challengeId === challengeId);
  
  if (!item) return null;
  
  item.completed = !item.completed;
  item.completedAt = item.completed ? new Date().toISOString() : undefined;
  
  saveTodoItems(items);
  return item;
}

/**
 * Check if a challenge is in the todo list
 */
export function isInTodoList(challengeId: string): boolean {
  const items = getTodoItems();
  return items.some((item) => item.challengeId === challengeId && !item.completed);
}

/**
 * Clear all completed todo items
 */
export function clearCompletedTodos(): void {
  const items = getTodoItems();
  const active = items.filter((item) => !item.completed);
  saveTodoItems(active);
}

