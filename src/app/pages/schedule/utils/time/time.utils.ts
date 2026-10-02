import {
  MINUTES_PER_DAY,
  PLANNER_PERIODS,
  PLANNER_SLOT_DURATION_MINUTES,
  POINT_EVENT_MINUTES,
} from '@pages/schedule/constants';
import type { PlannerEvent } from '@pages/schedule/models';

type EventTimes = Pick<PlannerEvent, 'startTime' | 'endTime'>;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Converts `HH:mm` to minutes since midnight; a missing time yields `NaN`. */
export function toMinutes(time: string | null): number {
  if (!time) return Number.NaN;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Converts minutes since midnight to `HH:mm`, using `24:00` for the end of the day. */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${(minutes % 60).toString().padStart(2, '0')}`;
}

/**
 * End used to place an event on the timeline. An event without an end occupies only
 * its starting minute, so it still collides with events that start at the same time.
 */
export function eventEndMinutes(event: EventTimes): number {
  return event.endTime
    ? toMinutes(event.endTime)
    : toMinutes(event.startTime) + POINT_EVENT_MINUTES;
}

export function durationInMinutes(event: EventTimes): number {
  if (!event.startTime || !event.endTime) return 0;
  return Math.max(0, toMinutes(event.endTime) - toMinutes(event.startTime));
}

/** End of the default one-slot block used when an undated event is placed on the timeline. */
export function slotEndTime(startTime: string): string {
  return minutesToTime(
    Math.min(toMinutes(startTime) + PLANNER_SLOT_DURATION_MINUTES, MINUTES_PER_DAY),
  );
}

/** UI validation; the API remains responsible for accepting scheduling changes. */
export function isPlannerInterval({ startTime, endTime }: EventTimes): boolean {
  if (!startTime) return !endTime;
  if (!TIME_PATTERN.test(startTime)) return false;
  if (!endTime) return true;
  return (
    (TIME_PATTERN.test(endTime) || endTime === '24:00') && toMinutes(endTime) > toMinutes(startTime)
  );
}

export function formatPlannerDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours === 0 ? `${remainder}min` : `${hours}h${remainder ? ` ${remainder}min` : ''}`;
}

/** `10:00 – 11:00`, `10:00 · Pontual` or `Sem horário`. */
export function formatEventTime(event: EventTimes): string {
  if (!event.startTime) return 'Sem horário';
  return event.endTime ? `${event.startTime} – ${event.endTime}` : `${event.startTime} · Pontual`;
}

export function periodAtHour(hour: number) {
  return (
    PLANNER_PERIODS.find((period) => hour >= period.start && hour < period.end) ??
    PLANNER_PERIODS[0]
  );
}
