export interface GetSkillSheetParams {}

export interface SupportingMemo {
  id: number;
  title: string;
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

export interface SkillSheetProjectEpisode {
  claim: string;
  situation?: string | null;
  decision?: string | null;
  reason?: string | null;
  supporting_memo_ids?: number[] | null;
  supporting_memos?: SupportingMemo[] | null;
  dropped_ids?: number[] | null;
}

export interface GetSkillSheetProject {
  id: number;
  type: number;
  title: string;
  mcp_alias?: string | null;
  start_period: string;
  end_period: string | null;
  description: string;
  role: string;
  scale: string;
  technologies: Technology[];
  processes: number[];
  memos: SkillSheetMemo[];
  episodes?: SkillSheetProjectEpisode[] | null;
  episodes_updated_at?: string | null;
  achievements?: string[] | null;
}

export type UpsertSkillSheetProjectParams = Omit<
  GetSkillSheetProject,
  'id' | 'end_period' | 'episodes' | 'episodes_updated_at'
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

export interface UpdateSkillSheetProjectEpisodesResponse {
  project_id: number;
  episodes: SkillSheetProjectEpisode[];
  episodes_updated_at: string | null;
}
