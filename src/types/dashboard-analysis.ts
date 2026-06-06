export interface DashboardAnalysisItem {
  title: string;
  description: string;
  category_names?: string[];
  memo_count?: number | null;
  goal_ids?: number[];
}

export interface DashboardAnalysisSuggestion {
  title: string;
  reason: string;
  priority: number;
  category_names?: string[];
  goal_ids?: number[];
}

export interface DashboardAnalysis {
  id: number;
  current_summary: string;
  strengths: DashboardAnalysisItem[];
  growing_areas: DashboardAnalysisItem[];
  weak_areas: DashboardAnalysisItem[];
  next_knowledge_suggestions: DashboardAnalysisSuggestion[];
  analyzed_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateDashboardAnalysisParams {
  current_summary: string;
  strengths?: DashboardAnalysisItem[];
  growing_areas?: DashboardAnalysisItem[];
  weak_areas?: DashboardAnalysisItem[];
  next_knowledge_suggestions?: DashboardAnalysisSuggestion[];
  analyzed_at: string;
}
