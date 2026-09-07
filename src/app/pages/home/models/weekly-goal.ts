export type WeeklyGoalPriority = 'LOW' | 'NORMAL' | 'HIGH';

export type WeeklyGoalCategory =
  'WORK' | 'STUDY' | 'HEALTH' | 'MIND' | 'WELLBEING' | 'PERSONAL' | 'PROJECT';

export interface WeeklyGoal {
  id: number;
  title: string;
  description: string;
  priority: WeeklyGoalPriority;
  category: WeeklyGoalCategory;
  habitId: number | null;
}
