import type { RecurrenceFields } from '@app/shared/recurrence/recurrence.model';

export type PlannerCategory = 'work' | 'study' | 'personal' | 'health' | 'event' | 'habit';

export type PlannerEventSource = 'internal' | 'google';

export type PlannerEventPriority = 'Alta' | 'Média' | 'Normal';

/**
 * Fields shared by the API response and the write payload. `date` is null for undated
 * events; `startTime` is null for untimed ones; `endTime` is null for point events.
 */
interface PlannerEventFields extends RecurrenceFields {
  title: string;
  date: string | null;
  description?: string;
  location?: string;
  source?: PlannerEventSource;
  completed?: boolean;
  priority?: PlannerEventPriority | null;
  startTime: string | null;
  endTime: string | null;
  category: PlannerCategory;
}

export interface PlannerEvent extends PlannerEventFields {
  id: number;
  kind: 'event';
}

export interface PlannerEventDraft extends PlannerEventFields {
  description: string;
}

/** A fixed one-hour interval in the 24-hour planner day. */
export interface PlannerTimeSlot {
  startTime: string;
  endTime: string;
}

/** Daily availability of the planner's one-hour slots, calculated by the API. */
export interface PlannerDayAvailability {
  date: string;
  totalBlocks: number;
  occupiedBlocks: number;
  availableBlocks: number;
  availableHours: number;
  slots: (PlannerTimeSlot & { available: boolean })[];
}

export interface PlannerHabit {
  id: number;
  title: string;
  completed: boolean;
}

export interface PositionedPlannerEvent extends PlannerEvent {
  column: number;
  columnCount: number;
}

export interface PlannerOverlapGroup {
  id: string;
  events: PlannerEvent[];
  startTime: string | null;
  endTime: string | null;
}

export interface PlannerDaySummary {
  date: string;
  events: PlannerEvent[];
  availability: PlannerDayAvailability;
  undatedCount: number;
  eventCount: number;
  plannedMinutes: number;
  freeMinutes: number;
  freeTimePercentage: number;
  nextActivity: PlannerEvent | null;
}
