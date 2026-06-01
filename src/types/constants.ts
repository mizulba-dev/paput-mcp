// Gender constants
export const GENDER = {
  1: 'Male',
  2: 'Female',
} as const;

// Project type constants
export const PROJECT_TYPE = {
  1: 'Business',
  2: 'Personal',
} as const;

// Category type constants
export const CATEGORY_TYPE = {
  1: 'Language',
  2: 'Framework',
  3: 'Database',
  4: 'Infrastructure',
} as const;

// Skill level constants
export const SKILL_LEVEL = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
} as const;

// Type definitions
export type GenderType = keyof typeof GENDER;
export type ProjectTypeType = keyof typeof PROJECT_TYPE;
export type CategoryTypeType = keyof typeof CATEGORY_TYPE;
export type SkillLevelType = keyof typeof SKILL_LEVEL;
