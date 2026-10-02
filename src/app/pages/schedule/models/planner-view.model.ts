import type { PlannerOverlapGroup, PlannerTimeSlot, PositionedPlannerEvent } from './planner.model';

export type PlannerViewMode = 'daily' | 'weekly';
export type PlannerPeriodId = 'dawn' | 'morning' | 'afternoon' | 'night';

export interface RadialGroup extends PlannerOverlapGroup {
  point: { x: number; y: number };
  startAngle: number;
  sweep: number;
  path: string;
  badge: { x: number; y: number };
}

/** A run of daily-view hours: free, expanded hour by hour, or condensed into its events. */
export interface PlannerDaySegment {
  id: string;
  kind: 'hours' | 'events' | 'free';
  slots: PlannerTimeSlot[];
  events: PositionedPlannerEvent[];
  startMinute: number;
  collapsible: boolean;
}
