export const GENDER = {
  1: 'Male',
  2: 'Female',
} as const;

export const PROJECT_TYPE = {
  1: 'Business',
  2: 'Personal',
} as const;

export const CATEGORY_TYPE = {
  1: 'Language',
  2: 'Framework',
  3: 'Database',
  4: 'Infrastructure',
} as const;

export const PROCESS = {
  1: 'Requirements',
  2: 'Basic design',
  3: 'Detailed design',
  4: 'Implementation',
  5: 'Testing',
  6: 'Maintenance',
} as const;

export const SKILL_LEVEL = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
} as const;

export type ProcessType = keyof typeof PROCESS;
export type GenderType = keyof typeof GENDER;
export type ProjectTypeType = keyof typeof PROJECT_TYPE;
export type CategoryTypeType = keyof typeof CATEGORY_TYPE;
export type SkillLevelType = keyof typeof SKILL_LEVEL;
