import { useState, useEffect } from "react";
import {
  getDailyItems,
  removeDailyItem,
  toggleDailyItem,
} from "../utils/dailyStorage";
import { achievementAPI, challengeAPI } from "../services/api";
import type { DailyItem } from "../types";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./Spinner";
import { TodoSkeletonList } from "./TodoSkeleton";
import { hapticFeedback } from "../utils/haptic";
import { useToast } from "../contexts/ToastContext";
import "../App.css";

interface DailyListProps {
  onNavigateToChallenge: (
    categoryId: string,
    skillId: string,
    challengeId: string
  ) => void;
}

export function DailyList({ onNavigateToChallenge }: DailyListProps) {
  const toast = useToast();
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDailyItems();
  }, []);

  const loadDailyItems = () => {
    setLoading(true);
    const items = getDailyItems();
    setDailyItems(items);
    setLoading(false);
  };

  const handleToggleComplete = async (challengeId: string) => {
    const item = dailyItems.find((i) => i.challengeId === challengeId);
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

        // Update daily item as completed
        toggleDailyItem(challengeId);
        loadDailyItems();
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
      // If unmarking as complete, just toggle the daily item status
      // (Note: This doesn't remove the achievement - achievements are permanent)
      hapticFeedback.light();
      setTogglingId(challengeId);
      toggleDailyItem(challengeId);
      loadDailyItems();
      setTimeout(() => setTogglingId(null), 300);
    }
  };

  const handleRemove = (challengeId: string) => {
    const item = dailyItems.find((i) => i.challengeId === challengeId);
    // Only allow removal of non-completed items
    if (item && !item.completed) {
      hapticFeedback.light();
      setRemovingId(challengeId);
      removeDailyItem(challengeId);
      setTimeout(() => {
        loadDailyItems();
        setRemovingId(null);
      }, 200);
    }
  };

  const handleNavigate = (
    categoryId: string,
    skillId: string,
    challengeId: string
  ) => {
    hapticFeedback.navigation();
    onNavigateToChallenge(categoryId, skillId, challengeId);
  };

  const activeItems = dailyItems.filter((item) => !item.completed);
  const completedItems = dailyItems.filter((item) => item.completed);
  const displayItems = showCompleted ? completedItems : activeItems;

  if (loading) {
    return (
      <div className="todo-list-container daily-list-container">
        <div className="todo-list-header">
          <h1 className="todo-list-title">Daily List</h1>
        </div>
        <ul className="todo-list">
          <TodoSkeletonList count={5} />
        </ul>
      </div>
    );
  }

  return (
    <div className="todo-list-container daily-list-container">
      <div className="todo-list-header">
        <h1 className="todo-list-title">Daily List</h1>
        {dailyItems.length > 0 && (
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

      {dailyItems.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No daily items yet"
          message="Add challenges from any skill to your daily list to track them here. Completed items will persist in your list."
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
                  ? "You haven't completed any daily items yet."
                  : "Great job! All your active daily items are complete."
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
                    {/* Only show remove button for active (non-completed) items */}
                    {!item.completed && (
                      <button
                        className="todo-remove-button"
                        onClick={() => handleRemove(item.challengeId)}
                        disabled={removingId === item.challengeId}
                        aria-label="Remove from daily list"
                      >
                        {removingId === item.challengeId ? (
                          <Spinner size="sm" />
                        ) : (
                          "×"
                        )}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
