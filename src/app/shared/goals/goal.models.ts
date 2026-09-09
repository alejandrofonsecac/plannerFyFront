export type GoalPriority = 'LOW' | 'NORMAL' | 'HIGH';
export type GoalCategory =
  'WORK' | 'STUDY' | 'HEALTH' | 'MIND' | 'WELLBEING' | 'PERSONAL' | 'PROJECT';
export type GoalStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

/** Fields accepted by the API. Defaults and validation belong to the backend. */
export interface GoalRequest {
  name: string;
  expectedTarget: string;
  priority: GoalPriority;
  category: GoalCategory;
  weekId?: string;
}
export interface Goal extends GoalRequest {
  id: number;
  weekId: string;
  status: GoalStatus;
  createdAt: string | null;
  completedAt: string | null;
  deferredCount: number;
  canComplete: boolean;
  canDefer: boolean;
}
export interface WeeklyFocus {
  focus: string;
  message: string;
}
export interface GoalWeek {
  id: string;
  previousId: string;
  nextId: string;
  currentId: string;
  start: string;
  end: string;
  current: boolean;
}
export interface GoalOptions {
  priorities: { value: GoalPriority; label: string }[];
  categories: { value: GoalCategory; label: string }[];
}
export interface GoalsBoard {
  summary: { completed: number; total: number; percentage: number };
  week: GoalWeek;
  goals: Goal[];
  focus: WeeklyFocus | null;
  defaults: GoalRequest;
  options: GoalOptions;
}
export interface GoalFilters {
  weekId?: string;
  category?: string;
  status?: GoalStatus;
}
