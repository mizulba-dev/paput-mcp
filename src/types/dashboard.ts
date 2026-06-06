export interface DashboardActivity {
  date: string;
  count: number;
}

export interface DashboardCategoryItemCount {
  category_id: number;
  category_name: string;
  item_count: number;
  is_top: boolean;
}

export interface DashboardCategoryRelation {
  source_id: number;
  target_id: number;
  strength: number;
  count: number;
}

export interface DashboardCategoryTimelineItem {
  date: string;
  count: number;
}

export interface DashboardCategoryTimelineData {
  category_id: string;
  category_name: string;
  data: DashboardCategoryTimelineItem[];
}

export interface DashboardSummary {
  total_memo_count: number;
  total_note_count: number;
  activities: DashboardActivity[];
  category_item_counts: DashboardCategoryItemCount[];
  category_relations: DashboardCategoryRelation[];
  category_timeline_data: DashboardCategoryTimelineData[];
  recent_memo_count: number;
  last_memo_created_at: string | null;
  active_days_in_last_30_days: number;
}
