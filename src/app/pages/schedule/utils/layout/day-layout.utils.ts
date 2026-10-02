import {
  PLANNER_CONDENSE_MINUTES,
  PLANNER_DAY_HOUR_HEIGHT,
  PLANNER_SLOT_DURATION_MINUTES,
  POINT_EVENT_HEIGHT,
} from '@pages/schedule/constants';
import type { PlannerDaySegment, PlannerEvent, PlannerTimeSlot } from '@pages/schedule/models';
import { eventsInInterval, layoutEvents } from './event-layout.utils';
import { durationInMinutes, eventEndMinutes, toMinutes } from '../time/time.utils';

/** Positions an event within an hourly segment using its actual minutes. */
export function plannerEventGeometry(
  event: Pick<PlannerEvent, 'startTime' | 'endTime'>,
  segmentStartMinute: number,
  hourHeight = PLANNER_DAY_HOUR_HEIGHT,
  segmentEndMinute = Infinity,
): { top: number; height: number } {
  const pixelsPerMinute = hourHeight / PLANNER_SLOT_DURATION_MINUTES;
  const start = Math.max(toMinutes(event.startTime), segmentStartMinute);
  const end = Math.min(eventEndMinutes(event), segmentEndMinute);
  return {
    top: (start - segmentStartMinute) * pixelsPerMinute,
    height: event.endTime ? Math.max(0, end - start) * pixelsPerMinute : POINT_EVENT_HEIGHT,
  };
}

function eventsInSlots(events: PlannerEvent[], slots: readonly PlannerTimeSlot[]): PlannerEvent[] {
  return eventsInInterval(
    events,
    toMinutes(slots[0].startTime),
    toMinutes(slots[slots.length - 1].endTime),
  );
}

/** Collapse only complete occupied-hour groups whose events are all long. */
export function plannerDaySegments(
  slots: readonly PlannerTimeSlot[],
  events: PlannerEvent[],
  expanded: ReadonlySet<string>,
): PlannerDaySegment[] {
  if (!slots.length) return [];

  const firstMinute = toMinutes(slots[0].startTime);
  const visibleEvents = eventsInSlots(events, slots);
  const occupiedByHour = slots.map((slot) => eventsInSlots(visibleEvents, [slot]));
  const segments: PlannerDaySegment[] = [];
  let index = 0;

  while (index < slots.length) {
    const start = index;
    const occupied = occupiedByHour[index].length > 0;
    if (occupied) {
      // Extend the group until every event that touches it has ended.
      let end = index + 1;
      for (let hour = index; hour < end; hour++) {
        for (const event of occupiedByHour[hour]) {
          const lastSlot = Math.ceil(
            (eventEndMinutes(event) - firstMinute) / PLANNER_SLOT_DURATION_MINUTES,
          );
          end = Math.max(end, Math.min(slots.length, lastSlot));
        }
      }
      index = end;
    } else {
      index++;
    }

    const groupSlots = slots.slice(start, index);
    const groupEvents = eventsInSlots(visibleEvents, groupSlots);
    const id = `${occupied ? 'events' : 'free'}-${groupSlots[0].startTime}-${groupSlots[groupSlots.length - 1].endTime}`;
    const canCondense =
      occupied &&
      groupSlots.length >= 2 &&
      groupEvents.every((event) => durationInMinutes(event) >= PLANNER_CONDENSE_MINUTES);
    const kind: PlannerDaySegment['kind'] = !occupied
      ? 'free'
      : canCondense && !expanded.has(id)
        ? 'events'
        : 'hours';

    segments.push({
      id,
      kind,
      slots: groupSlots,
      events: layoutEvents(groupEvents),
      startMinute: toMinutes(groupSlots[0].startTime),
      collapsible: canCondense,
    });
  }

  return segments;
}
