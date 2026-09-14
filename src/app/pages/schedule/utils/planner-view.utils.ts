import { PLANNER_PERIODS } from '@pages/schedule/constants';
import type { RadialGroup, PlannerEvent } from '@pages/schedule/models';
import { groupOverlappingEvents, toMinutes } from './planner.utils';

export function periodAtHour(hour: number) {
  return (
    PLANNER_PERIODS.find((period) => hour >= period.start && hour < period.end) ??
    PLANNER_PERIODS[0]
  );
}

export function eventsInInterval(
  events: PlannerEvent[],
  start: number,
  end: number,
): PlannerEvent[] {
  return events.filter(
    (event) => toMinutes(event.startTime) < end && toMinutes(event.endTime) > start,
  );
}

export function pointOnClock(angle: number, radius = 132): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: 170 + radius * Math.cos(radians), y: 170 + radius * Math.sin(radians) };
}

export function clockArc(start: number, sweep: number, radius = 132): string {
  const first = pointOnClock(start, radius);
  const last = pointOnClock(start + Math.min(sweep, 359.99), radius);
  return `M ${first.x} ${first.y} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${last.x} ${last.y}`;
}

/** Returns the nearest hour around a 24-hour dial. Midnight wraps from either side. */
export function hourAtPoint(x: number, y: number): number {
  const angle = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
  return Math.round(angle / 15) % 24;
}

export function radialGroups(events: PlannerEvent[]): RadialGroup[] {
  return groupOverlappingEvents(events).map((group) => {
    const startAngle = toMinutes(group.startTime) / 4;
    const sweep = Math.max(8, (toMinutes(group.endTime) - toMinutes(group.startTime)) / 4);
    return {
      ...group,
      startAngle,
      sweep,
      path: clockArc(startAngle, sweep),
      badge: pointOnClock(startAngle + sweep / 2, 104),
    };
  });
}
