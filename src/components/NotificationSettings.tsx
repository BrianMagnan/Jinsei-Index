// Notification settings component
import { useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../contexts/ToastContext";
import { Spinner } from "./Spinner";
import "../App.css";

export function NotificationSettings() {
  const toast = useToast();
  const {
    isSupported,
    permission,
    preferences,
    canSend,
    requestPermission,
    updatePreferences,
    enable,
    disable,
  } = useNotifications();

  const [requestingPermission, setRequestingPermission] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isSupported) {
    return (
      <div className="notification-settings">
        <div className="notification-settings-header">
          <h2>Notifications</h2>
        </div>
        <div className="notification-settings-content">
          <p className="notification-unsupported">
            Browser notifications are not supported in this browser.
          </p>
        </div>
      </div>
    );
  }

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      const newPermission = await requestPermission();
      if (newPermission === "granted") {
        toast.showSuccess("Notification permission granted!");
      } else {
        toast.showError("Notification permission denied.");
      }
    } catch (error) {
      toast.showError(
        error instanceof Error
          ? error.message
          : "Failed to request notification permission"
      );
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleToggleEnabled = () => {
    if (preferences.enabled) {
      disable();
      toast.showSuccess("Notifications disabled");
    } else {
      if (permission !== "granted") {
        toast.showError("Please grant notification permission first");
        return;
      }
      enable();
      toast.showSuccess("Notifications enabled");
    }
  };

  const handleTimeChange = (
    type: "dailyReminder" | "streakWarning",
    time: string
  ) => {
    updatePreferences({
      [type]: {
        ...preferences[type],
        time,
      },
    });
  };

  const handleToggleType = (type: keyof typeof preferences) => {
    if (type === "enabled") {
      handleToggleEnabled();
      return;
    }

    const currentValue = preferences[type];
    if (
      typeof currentValue === "object" &&
      currentValue !== null &&
      "enabled" in currentValue
    ) {
      updatePreferences({
        [type]: {
          ...currentValue,
          enabled: !currentValue.enabled,
        },
      });
    }
  };

  const handleDaysBeforeChange = (days: number) => {
    updatePreferences({
      goalDeadline: {
        ...preferences.goalDeadline,
        daysBefore: days,
      },
    });
  };

  return (
    <div className="notification-settings">
      <div className="notification-settings-header">
        <h2>Notification Settings</h2>
        {permission !== "granted" && (
          <button
            className="notification-request-button"
            onClick={handleRequestPermission}
            disabled={requestingPermission}
          >
            {requestingPermission ? (
              <>
                <Spinner size="sm" />
                Requesting...
              </>
            ) : (
              "Enable Notifications"
            )}
          </button>
        )}
      </div>

      <div className="notification-settings-content">
        {permission === "denied" && (
          <div className="notification-warning">
            <p>
              ⚠️ Notification permission was denied. Please enable it in your
              browser settings to receive notifications.
            </p>
          </div>
        )}

        {permission === "granted" && (
          <>
            <div className="notification-setting-item">
              <div className="notification-setting-label">
                <label htmlFor="notifications-enabled">
                  Enable Notifications
                </label>
                <span className="notification-setting-description">
                  Turn on/off all notifications
                </span>
              </div>
              <button
                id="notifications-enabled"
                className={`toggle-button ${
                  preferences.enabled ? "on" : "off"
                }`}
                onClick={handleToggleEnabled}
                aria-label="Toggle notifications"
              >
                <span className="toggle-slider"></span>
              </button>
            </div>

            {preferences.enabled && (
              <>
                <div className="notification-divider"></div>

                <div className="notification-setting-item">
                  <div className="notification-setting-label">
                    <label htmlFor="daily-reminder">
                      Daily Challenge Reminder
                    </label>
                    <span className="notification-setting-description">
                      Get reminded to complete your daily challenges
                    </span>
                  </div>
                  <div className="notification-setting-controls">
                    <button
                      className={`toggle-button ${
                        preferences.dailyReminder.enabled ? "on" : "off"
                      }`}
                      onClick={() => handleToggleType("dailyReminder")}
                      aria-label="Toggle daily reminder"
                    >
                      <span className="toggle-slider"></span>
                    </button>
                    {preferences.dailyReminder.enabled && (
                      <input
                        type="time"
                        className="time-input"
                        value={preferences.dailyReminder.time}
                        onChange={(e) =>
                          handleTimeChange("dailyReminder", e.target.value)
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="notification-setting-item">
                  <div className="notification-setting-label">
                    <label htmlFor="streak-warning">Streak Warning</label>
                    <span className="notification-setting-description">
                      Get warned before your streak ends
                    </span>
                  </div>
                  <div className="notification-setting-controls">
                    <button
                      className={`toggle-button ${
                        preferences.streakWarning.enabled ? "on" : "off"
                      }`}
                      onClick={() => handleToggleType("streakWarning")}
                      aria-label="Toggle streak warning"
                    >
                      <span className="toggle-slider"></span>
                    </button>
                    {preferences.streakWarning.enabled && (
                      <input
                        type="time"
                        className="time-input"
                        value={preferences.streakWarning.time}
                        onChange={(e) =>
                          handleTimeChange("streakWarning", e.target.value)
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="notification-setting-item">
                  <div className="notification-setting-label">
                    <label htmlFor="level-up">Level Up Notifications</label>
                    <span className="notification-setting-description">
                      Get notified when you level up
                    </span>
                  </div>
                  <button
                    className={`toggle-button ${
                      preferences.levelUp.enabled ? "on" : "off"
                    }`}
                    onClick={() => handleToggleType("levelUp")}
                    aria-label="Toggle level up notifications"
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>

                <div className="notification-setting-item">
                  <div className="notification-setting-label">
                    <label htmlFor="goal-deadline">
                      Goal Deadline Reminders
                    </label>
                    <span className="notification-setting-description">
                      Get reminded about approaching goal deadlines
                    </span>
                  </div>
                  <div className="notification-setting-controls">
                    <button
                      className={`toggle-button ${
                        preferences.goalDeadline.enabled ? "on" : "off"
                      }`}
                      onClick={() => handleToggleType("goalDeadline")}
                      aria-label="Toggle goal deadline reminders"
                    >
                      <span className="toggle-slider"></span>
                    </button>
                    {preferences.goalDeadline.enabled && (
                      <select
                        className="days-select"
                        value={preferences.goalDeadline.daysBefore}
                        onChange={(e) =>
                          handleDaysBeforeChange(Number(e.target.value))
                        }
                      >
                        <option value={0}>On deadline</option>
                        <option value={1}>1 day before</option>
                        <option value={3}>3 days before</option>
                        <option value={7}>1 week before</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="notification-setting-item">
                  <div className="notification-setting-label">
                    <label htmlFor="achievement-unlocked">
                      Achievement Unlocked
                    </label>
                    <span className="notification-setting-description">
                      Get notified when you unlock achievements
                    </span>
                  </div>
                  <button
                    className={`toggle-button ${
                      preferences.achievementUnlocked.enabled ? "on" : "off"
                    }`}
                    onClick={() => handleToggleType("achievementUnlocked")}
                    aria-label="Toggle achievement notifications"
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {permission === "default" && (
          <div className="notification-permission-prompt">
            <p>
              Enable notifications to get reminders about your challenges and
              progress.
            </p>
            <button
              className="notification-request-button primary"
              onClick={handleRequestPermission}
              disabled={requestingPermission}
            >
              {requestingPermission ? (
                <>
                  <Spinner size="sm" />
                  Requesting...
                </>
              ) : (
                "Enable Notifications"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
