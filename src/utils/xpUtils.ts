// Utility functions for XP and level calculations

// Calculate XP needed for next level
export function getXPForNextLevel(level: number, xpPerLevel: number = 100): number {
  return level * xpPerLevel;
}

// Calculate current level progress (0-1)
export function getLevelProgress(currentXP: number, level: number, xpPerLevel: number = 100): number {
  const xpForCurrentLevel = (level - 1) * xpPerLevel;
  const xpForNextLevel = level * xpPerLevel;
  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  
  return Math.min(1, Math.max(0, xpInCurrentLevel / xpNeededForLevel));
}

// Calculate XP needed to reach next level
export function getXPNeededForNextLevel(currentXP: number, level: number, xpPerLevel: number = 100): number {
  const xpForNextLevel = level * xpPerLevel;
  return Math.max(0, xpForNextLevel - currentXP);
}

// Format XP with commas
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}

