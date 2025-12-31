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
  subSkills?: SubSkill[];
}

export interface SubSkill {
  _id: string;
  name: string;
  description?: string;
  skill: string | Skill;
  createdAt?: string;
  updatedAt?: string;
  challenges?: Challenge[];
}

export interface Challenge {
  _id: string;
  name: string;
  description?: string;
  subSkill: string | SubSkill;
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
  subSkills: SubSkillWithHierarchy[];
}

export interface SubSkillWithHierarchy extends SubSkill {
  skill: Skill;
  challenges: Challenge[];
}

export interface ChallengeWithHierarchy extends Challenge {
  subSkill: SubSkillWithHierarchy;
}

export interface AchievementWithHierarchy extends Achievement {
  challenge: ChallengeWithHierarchy;
}

