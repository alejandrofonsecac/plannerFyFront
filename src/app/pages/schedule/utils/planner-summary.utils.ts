import type { PlannerEvent } from '@pages/schedule/models';
import { getPlannerDayAvailability, toMinutes } from './planner.utils';

export function hasPlannerConflict(
  events: PlannerEvent[],
  candidate: Pick<PlannerEvent, 'date' | 'startTime' | 'endTime'>,
  ignoredId?: number,
): boolean {
  return events.some(
    (event) =>
      event.id !== ignoredId &&
      event.date === candidate.date &&
      toMinutes(event.startTime) < toMinutes(candidate.endTime) &&
      toMinutes(event.endTime) > toMinutes(candidate.startTime),
  );
}

export function formatPlannerDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours === 0 ? `${remainder}min` : `${hours}h${remainder ? ` ${remainder}min` : ''}`;
}

export function summarizePlannerDay(
  date: string,
  events: PlannerEvent[],
  unscheduledTaskCount: number,
) {
  const dayEvents = events.filter((event) => event.date === date);
  const availability = getPlannerDayAvailability(date, dayEvents);
  return {
    events: dayEvents,
    availability,
    taskCount: unscheduledTaskCount + dayEvents.filter((event) => event.kind === 'task').length,
    eventCount: dayEvents.filter((event) => event.kind === 'event').length,
    plannedHours: formatPlannerDuration(availability.occupiedBlocks * 60),
    freeTime: formatPlannerDuration(availability.availableBlocks * 60),
    freeTimePercentage: Math.round((availability.availableBlocks / availability.totalBlocks) * 100),
  };
}
