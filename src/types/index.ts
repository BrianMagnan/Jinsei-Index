// Core data types for the Jinsei Index app

export interface Category {
  _id: string;
  name: string;
  description?: string;
  xp: number;
  level: number;
  createdAt?: string;
  updatedAt?: string;
  skills?: Skill[];
}

export interface Skill {
  _id: string;
  name: string;
  description?: string;
  category: string | Category;
  xp: number;
  level: number;
  createdAt?: string;
  updatedAt?: string;
  challenges?: Challenge[];
}

export interface Challenge {
  _id: string;
  name: string;
  description?: string;
  skill: string | Skill;
  xpReward: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Achievement {
  _id: string;
  challenge: string | Challenge;
  completedAt: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// For displaying the full hierarchy
export interface CategoryWithHierarchy extends Category {
  skills: SkillWithHierarchy[];
}

export interface SkillWithHierarchy extends Skill {
  category: Category;
  challenges: Challenge[];
}

export interface ChallengeWithHierarchy extends Challenge {
  skill: SkillWithHierarchy;
}

export interface AchievementWithHierarchy extends Achievement {
  challenge: ChallengeWithHierarchy;
}

export interface Profile {
  _id: string;
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
  totalXP?: number;
  totalLevel?: number;
  createdAt?: string;
  updatedAt?: string;
}

