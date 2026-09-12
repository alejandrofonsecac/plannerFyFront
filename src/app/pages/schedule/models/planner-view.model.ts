import type { PlannerOverlapGroup } from './planner.model';

export type PlannerContent = 'planning' | 'tasks';
export type PlannerViewMode = 'daily' | 'weekly';
export type PlannerPeriodId = 'dawn' | 'morning' | 'afternoon' | 'night';

export interface RadialGroup extends PlannerOverlapGroup {
  startAngle: number;
  sweep: number;
  path: string;
  badge: { x: number; y: number };
}
