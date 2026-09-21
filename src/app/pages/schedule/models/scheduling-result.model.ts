import type { PlannerEvent } from './planner.model';

export type SchedulingResult =
  | { status: 'saved'; event?: PlannerEvent }
  | { status: 'occupied' | 'invalid' | 'missing-task' | 'busy' | 'failed' };
