export interface GetSkillSheetParams {}

export interface StrengthLabel {
  label: string;
  description?: string | null;
  category_names?: string[] | null;
  project_ids?: string[] | null;
}

export interface ProjectHighlight {
  project_id: string;
  title: string;
  summary: string;
  strength_labels?: string[] | null;
  achievement_bullets?: string[] | null;
}

export interface GetSkillSheetResponse {
  id: number;
  nearest_station: string | null;
  gender: number;
  birth_date: string;
  years_of_experience: number;
  self_pr: string | null;
  headline?: string | null;
  profile_summary?: string | null;
  strength_labels?: StrengthLabel[] | null;
  project_highlights?: ProjectHighlight[] | null;
  skills: GetSkillSheetSkill[];
  projects: GetSkillSheetProject[];
}

export interface UpdatePublicProfileParams {
  headline?: string;
  profile_summary?: string;
  strength_labels?: StrengthLabel[];
  project_highlights?: ProjectHighlight[];
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
  ai_summary?: string | null;
  ai_summary_updated_at?: string | null;
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

export interface GetProjectsResponse {
  projects: GetSkillSheetProject[];
}

export interface UpdateSkillSheetProjectAiSummaryResponse {
  id: number;
  title: string;
  ai_summary: string | null;
  ai_summary_updated_at: string | null;
}

export interface PublicProfileContextSkill {
  name: string;
  level: string | null;
  category_name: string | null;
}

export interface PublicProfileContextProject {
  id: string;
  name: string;
  role: string | null;
  ai_summary: string | null;
  description: string | null;
}

export interface PublicProfileContextMemo {
  id: string;
  title: string;
  category_names: string[];
  updated_at: string;
}

export interface PublicProfileContextSkillSheet {
  headline: string | null;
  profile_summary: string | null;
  self_pr: string | null;
  years_of_experience: number;
  skills: PublicProfileContextSkill[];
  projects: PublicProfileContextProject[];
  strength_labels: StrengthLabel[];
  project_highlights: ProjectHighlight[];
}

export interface PublicProfileContextResponse {
  skill_sheet: PublicProfileContextSkillSheet;
  knowledge_map: unknown;
  growing_areas: unknown[];
  recent_public_memos: PublicProfileContextMemo[];
}
