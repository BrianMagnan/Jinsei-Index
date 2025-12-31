import {
  getLevelProgress,
  getXPNeededForNextLevel,
  formatXP,
} from "../utils/xpUtils";

interface XPBarProps {
  currentXP: number;
  level: number;
  xpPerLevel?: number;
  showLabels?: boolean;
}

export function XPBar({
  currentXP,
  level,
  xpPerLevel = 100,
  showLabels = true,
}: XPBarProps) {
  const progress = getLevelProgress(currentXP, level, xpPerLevel);
  const xpNeeded = getXPNeededForNextLevel(currentXP, level, xpPerLevel);

  return (
    <div className="xp-bar">
      {showLabels && (
        <div className="xp-bar-labels">
          <span className="xp-current">Level {level}</span>
          <span className="xp-next">{formatXP(xpNeeded)} XP to next level</span>
        </div>
      )}
      <div className="xp-bar-container">
        <div className="xp-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      {showLabels && (
        <div className="xp-bar-stats">
          {/* <span>
            {formatXP(currentXP)} / {formatXP(level * xpPerLevel)} XP
          </span> */}
        </div>
      )}
    </div>
  );
}
