import { useState, useEffect } from "react";
import {
  getTodoItems,
  removeTodoItem,
  toggleTodoItem,
  clearCompletedTodos,
} from "../utils/todoStorage";
import { achievementAPI, challengeAPI } from "../services/api";
import type { TodoItem } from "../types";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./Spinner";
import { TodoSkeletonList } from "./TodoSkeleton";
import { PullToRefresh } from "./PullToRefresh";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";
import "../App.css";

interface TodoListProps {
  onNavigateToChallenge: (
    categoryId: string,
    skillId: string,
    challengeId: string
  ) => void;
}

export function TodoList({ onNavigateToChallenge }: TodoListProps) {
  const toast = useToast();
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    loadTodoItems();
  }, []);

  const loadTodoItems = () => {
    setLoading(true);
    const items = getTodoItems();
    setTodoItems(items);
    setLoading(false);
  };

  const handleToggleComplete = async (challengeId: string) => {
    const item = todoItems.find((i) => i.challengeId === challengeId);
    if (!item) return;

    // If marking as complete, create achievement and award XP
    if (!item.completed) {
      hapticFeedback.medium();
      setCompletingId(challengeId);
      setTogglingId(challengeId);

      try {
        // Create achievement to complete the challenge and award XP
        await achievementAPI.create({ challenge: challengeId });

        // Fetch challenge details to get XP reward for success message
        try {
          const challenge = await challengeAPI.getById(challengeId);
          hapticFeedback.success();
          toast.showSuccess(
            `Challenge "${item.challengeName}" completed! +${challenge.xpReward} XP`
          );
        } catch {
          // If fetching challenge fails, still show success
          hapticFeedback.success();
          toast.showSuccess(`Challenge "${item.challengeName}" completed!`);
        }

        // Update todo item as completed
        toggleTodoItem(challengeId);
        loadTodoItems();
      } catch (err) {
        hapticFeedback.error();
        toast.showError(
          err instanceof Error ? err.message : "Failed to complete challenge"
        );
      } finally {
        setCompletingId(null);
        setTimeout(() => setTogglingId(null), 300);
      }
    } else {
      // If unmarking as complete, just toggle the todo item status
      // (Note: This doesn't remove the achievement - achievements are permanent)
      hapticFeedback.light();
      setTogglingId(challengeId);
      toggleTodoItem(challengeId);
      loadTodoItems();
      setTimeout(() => setTogglingId(null), 300);
    }
  };

  const handleRemove = (challengeId: string) => {
    hapticFeedback.light();
    setRemovingId(challengeId);
    removeTodoItem(challengeId);
    setTimeout(() => {
      loadTodoItems();
      setRemovingId(null);
    }, 200);
  };

  const handleNavigate = (
    categoryId: string,
    skillId: string,
    challengeId: string
  ) => {
    hapticFeedback.navigation();
    onNavigateToChallenge(categoryId, skillId, challengeId);
  };

  const handleClearCompleted = () => {
    hapticFeedback.light();
    setClearingCompleted(true);
    clearCompletedTodos();
    setTimeout(() => {
      loadTodoItems();
      setClearingCompleted(false);
    }, 200);
  };

  const activeItems = todoItems.filter((item) => !item.completed);
  const completedItems = todoItems.filter((item) => item.completed);
  const displayItems = showCompleted ? completedItems : activeItems;

  if (loading) {
    return (
      <div className="todo-list-container">
        <div className="todo-list-header">
          <h1 className="todo-list-title">To-Do List</h1>
        </div>
        <ul className="todo-list">
          <TodoSkeletonList count={5} />
        </ul>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadTodoItems} disabled={loading}>
      <div className="todo-list-container">
        <div className="todo-list-header">
          <h1 className="todo-list-title">To-Do List</h1>
          {todoItems.length > 0 && (
          <div className="todo-list-stats">
            <span className="todo-stat">
              {activeItems.length} active
              {completedItems.length > 0 && (
                <span className="todo-stat-separator"> • </span>
              )}
            </span>
            {completedItems.length > 0 && (
              <span className="todo-stat">
                {completedItems.length} completed
              </span>
            )}
          </div>
        )}
      </div>

      {todoItems.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No to-do items yet"
          message="Add challenges from any skill to your to-do list to track them here."
        />
      ) : (
        <>
          {activeItems.length > 0 && completedItems.length > 0 && (
            <div className="todo-list-tabs">
              <button
                className={`todo-tab ${!showCompleted ? "active" : ""}`}
                onClick={() => {
                  hapticFeedback.navigation();
                  setShowCompleted(false);
                }}
              >
                Active ({activeItems.length})
              </button>
              <button
                className={`todo-tab ${showCompleted ? "active" : ""}`}
                onClick={() => {
                  hapticFeedback.navigation();
                  setShowCompleted(true);
                }}
              >
                Completed ({completedItems.length})
              </button>
            </div>
          )}

          {displayItems.length === 0 ? (
            <EmptyState
              icon={showCompleted ? "✅" : "📋"}
              title={showCompleted ? "No completed items" : "All done! 🎉"}
              message={
                showCompleted
                  ? "You haven't completed any to-do items yet."
                  : "Great job! All your active to-do items are complete."
              }
            />
          ) : (
            <ul className="todo-list">
              {displayItems.map((item) => (
                <li
                  key={item.challengeId}
                  className={`todo-item ${item.completed ? "completed" : ""} ${
                    removingId === item.challengeId ? "removing" : ""
                  }`}
                >
                  <div className="todo-item-content">
                    <button
                      className="todo-checkbox"
                      onClick={() => handleToggleComplete(item.challengeId)}
                      disabled={
                        togglingId === item.challengeId ||
                        completingId === item.challengeId
                      }
                      aria-label={
                        item.completed
                          ? "Mark as incomplete"
                          : "Mark as complete"
                      }
                    >
                      {togglingId === item.challengeId ||
                      completingId === item.challengeId ? (
                        <Spinner size="sm" />
                      ) : (
                        <span className="todo-checkbox-icon">
                          {item.completed ? "✓" : ""}
                        </span>
                      )}
                    </button>
                    <div
                      className="todo-item-info"
                      onClick={() =>
                        !item.completed &&
                        handleNavigate(
                          item.categoryId,
                          item.skillId,
                          item.challengeId
                        )
                      }
                    >
                      <h3 className="todo-item-name">{item.challengeName}</h3>
                      <div className="todo-item-path">
                        <span className="todo-path-category">
                          {item.categoryName}
                        </span>
                        <span className="todo-path-separator"> › </span>
                        <span className="todo-path-skill">
                          {item.skillName}
                        </span>
                      </div>
                    </div>
                    <button
                      className="todo-remove-button"
                      onClick={() => handleRemove(item.challengeId)}
                      disabled={removingId === item.challengeId}
                      aria-label="Remove from to-do list"
                    >
                      {removingId === item.challengeId ? (
                        <Spinner size="sm" />
                      ) : (
                        "×"
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showCompleted && completedItems.length > 0 && (
            <div className="todo-list-actions">
              <button
                className="todo-clear-button"
                onClick={handleClearCompleted}
                disabled={clearingCompleted}
              >
                {clearingCompleted ? (
                  <>
                    <Spinner size="sm" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  "Clear Completed"
                )}
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </PullToRefresh>
  );
}
