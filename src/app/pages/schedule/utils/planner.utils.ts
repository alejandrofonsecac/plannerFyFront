import { PLANNER_DAY_SLOTS, PLANNER_SLOT_COUNT } from '@pages/schedule/constants';
import type {
  PlannerDayAvailability,
  PlannerEvent,
  PlannerOverlapGroup,
  PositionedPlannerEvent,
} from '@pages/schedule/models';

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses a calendar date in the user's timezone and rejects impossible dates. */
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function addDays(date: Date, amount: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function durationInMinutes(event: Pick<PlannerEvent, 'startTime' | 'endTime'>): number {
  return Math.max(0, toMinutes(event.endTime) - toMinutes(event.startTime));
}

export function isPlannerTimeSlot(interval: Pick<PlannerEvent, 'startTime' | 'endTime'>): boolean {
  return PLANNER_DAY_SLOTS.some(
    (slot) => slot.startTime === interval.startTime && slot.endTime === interval.endTime,
  );
}

/** UI validation; the API remains responsible for accepting scheduling changes. */
export function isPlannerInterval(interval: Pick<PlannerEvent, 'startTime' | 'endTime'>): boolean {
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return (
    timePattern.test(interval.startTime) &&
    (timePattern.test(interval.endTime) || interval.endTime === '24:00') &&
    toMinutes(interval.endTime) > toMinutes(interval.startTime)
  );
}

/**
 * Converts events into a unique set of occupied one-hour slots. Counting slots
 * instead of event duration keeps the result correct even if legacy API data
 * contains overlapping or malformed events.
 */
export function getPlannerDayAvailability(
  date: string,
  events: PlannerEvent[],
): PlannerDayAvailability {
  const eventsForDate = events.filter((event) => event.date === date);
  const slots = PLANNER_DAY_SLOTS.map((slot) => {
    const slotStart = toMinutes(slot.startTime);
    const slotEnd = toMinutes(slot.endTime);
    const available = !eventsForDate.some(
      (event) => toMinutes(event.startTime) < slotEnd && toMinutes(event.endTime) > slotStart,
    );

    return { ...slot, available };
  });
  const availableBlocks = slots.filter((slot) => slot.available).length;

  return {
    date,
    totalBlocks: PLANNER_SLOT_COUNT,
    occupiedBlocks: PLANNER_SLOT_COUNT - availableBlocks,
    availableBlocks,
    availableHours: availableBlocks,
    slots,
  };
}

export function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const offset = result.getDay() === 0 ? -6 : 1 - result.getDay();
  result.setDate(result.getDate() + offset);
  return result;
}

export function getWeekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function layoutEvents(events: PlannerEvent[]): PositionedPlannerEvent[] {
  const sorted = [...events].sort(
    (first, second) => toMinutes(first.startTime) - toMinutes(second.startTime),
  );
  const groups: PlannerEvent[][] = [];
  let currentGroup: PlannerEvent[] = [];
  let furthestEnd = 0;

  for (const event of sorted) {
    const eventStart = toMinutes(event.startTime);
    if (currentGroup.length > 0 && eventStart >= furthestEnd) {
      groups.push(currentGroup);
      currentGroup = [];
      furthestEnd = 0;
    }

    currentGroup.push(event);
    furthestEnd = Math.max(furthestEnd, toMinutes(event.endTime));
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups.flatMap((group) => {
    const columnsEnd: number[] = [];
    const positioned = group.map((event) => {
      const start = toMinutes(event.startTime);
      let column = columnsEnd.findIndex((end) => end <= start);
      if (column === -1) {
        column = columnsEnd.length;
      }
      columnsEnd[column] = toMinutes(event.endTime);
      return { ...event, column, columnCount: 1 };
    });

    return positioned.map((event) => ({ ...event, columnCount: columnsEnd.length }));
  });
}

/** Groups events whose intervals intersect, keeping the DOM order chronological. */
export function groupOverlappingEvents(events: PlannerEvent[]): PlannerOverlapGroup[] {
  const sorted = [...events].sort(
    (first, second) => toMinutes(first.startTime) - toMinutes(second.startTime),
  );
  const groups: PlannerOverlapGroup[] = [];
  let groupEvents: PlannerEvent[] = [];
  let groupEnd = 0;

  const saveGroup = () => {
    if (groupEvents.length === 0) {
      return;
    }

    groups.push({
      id: groupEvents.map((event) => event.id).join('-'),
      events: groupEvents,
      startTime: groupEvents[0].startTime,
      endTime: `${Math.floor(groupEnd / 60)
        .toString()
        .padStart(2, '0')}:${(groupEnd % 60).toString().padStart(2, '0')}`,
    });
  };

  for (const event of sorted) {
    const start = toMinutes(event.startTime);

    if (groupEvents.length > 0 && start >= groupEnd) {
      saveGroup();
      groupEvents = [];
      groupEnd = 0;
    }

    groupEvents.push(event);
    groupEnd = Math.max(groupEnd, toMinutes(event.endTime));
  }

  saveGroup();
  return groups;
}
