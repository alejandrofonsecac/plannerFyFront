import type { PlannerEvent, RadialGroup } from '@pages/schedule/models';
import { groupOverlappingEvents } from '../layout/event-layout.utils';
import { eventEndMinutes, toMinutes } from '../time/time.utils';

const MINUTES_PER_DEGREE = 4;
const MIN_SWEEP_DEGREES = 8;

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
    const start = toMinutes(group.startTime);
    const end = Math.max(...group.events.map(eventEndMinutes));
    const startAngle = start / MINUTES_PER_DEGREE;
    const sweep = Math.max(MIN_SWEEP_DEGREES, (end - start) / MINUTES_PER_DEGREE);
    return {
      ...group,
      point: pointOnClock(startAngle),
      startAngle,
      sweep,
      path: clockArc(startAngle, sweep),
      badge: pointOnClock(startAngle + sweep / 2, 104),
    };
  });
}
