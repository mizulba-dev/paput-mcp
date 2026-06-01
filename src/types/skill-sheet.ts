// Get skill sheet parameters
export interface GetSkillSheetParams {
  // No parameters for get skill sheet
}

export interface GetSkillSheetResponse {
  id: number;
  nearest_station: string | null;
  gender: number;
  birth_date: string;
  years_of_experience: number;
  self_pr: string | null;
  skills: GetSkillSheetSkill[];
  projects: GetSkillSheetProject[];
}

export interface GetSkillSheetSkill {
  category: {
    id: number;
    name: string;
  };
  category_type: number;
  level: string;
  years: number;
}

export interface GetSkillSheetProject {
  id: number;
  type: number;
  title: string;
  start_period: string;
  end_period: string | null;
  description: string;
  role: string;
  scale: string;
  technologies: Technology[];
  processes: number[];
  memos: SkillSheetMemo[];
}

export type UpsertSkillSheetProjectParams = Omit<
  GetSkillSheetProject,
  'id' | 'end_period'
> & {
  id?: number;
  end_period?: string | null;
};

export interface Technology {
  id?: number;
  name: string;
}

export interface SkillSheetMemo {
  id: number;
  title: string;
}

// Create skill sheet parameters
export interface CreateSkillSheetParams {
  nearest_station: string | null;
  gender: number;
  birth_date: string;
  years_of_experience: number;
  self_pr: string | null;
  skills: GetSkillSheetSkill[];
  projects: GetSkillSheetProject[];
}

export interface CreateSkillSheetResponse {
  success: boolean;
  id?: number;
  error?: string;
}

// Update skill sheet parameters
export interface UpdateSkillSheetParams {
  nearest_station?: string | null;
  gender?: number;
  birth_date?: string;
  years_of_experience?: number;
  self_pr?: string | null;
  skills?: GetSkillSheetSkill[];
  projects?: GetSkillSheetProject[];
}

export interface UpdateSkillSheetResponse {
  success: boolean;
  error?: string;
}

// Skill types
export interface SkillSheetSkill {
  id?: number;
  category: {
    id: number;
    name: string;
  };
  category_type: number;
  level: string;
  years: number;
}

// Project types
export interface GetProjectsResponse {
  projects: GetSkillSheetProject[];
}
