export type GoalCategory =
  | 'career'
  | 'learning'
  | 'portfolio'
  | 'project'
  | 'other';

export type GoalStatus = 'active' | 'archived';

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalParams {
  title: string;
  description?: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: number;
  target_date?: string | null;
}

export interface UpdateGoalParams extends CreateGoalParams {
  id: number;
}
