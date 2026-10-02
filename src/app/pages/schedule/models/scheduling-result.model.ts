import type { PlannerEvent } from './planner.model';

export type SchedulingFailure =
  'occupied' | 'invalid' | 'missing-event' | 'busy' | 'failed' | 'unauthorized' | 'forbidden';

export type SchedulingResult =
  { status: 'saved'; event?: PlannerEvent } | { status: SchedulingFailure };
