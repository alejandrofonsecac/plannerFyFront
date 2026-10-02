import type {
  PlannerEvent,
  PlannerOverlapGroup,
  PositionedPlannerEvent,
} from '@pages/schedule/models';
import { eventEndMinutes, minutesToTime, toMinutes } from '../time/time.utils';

/** Events with a start time, in chronological order; undated or untimed events have no slot. */
function timedEventsByStart(events: PlannerEvent[]): PlannerEvent[] {
  return events
    .filter((event) => event.startTime !== null)
    .sort((first, second) => toMinutes(first.startTime) - toMinutes(second.startTime));
}

/** Splits chronological events into clusters whose intervals intersect. */
function overlapClusters(events: PlannerEvent[]): PlannerEvent[][] {
  const clusters: PlannerEvent[][] = [];
  let current: PlannerEvent[] = [];
  let clusterEnd = 0;

  for (const event of timedEventsByStart(events)) {
    if (current.length > 0 && toMinutes(event.startTime) >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = 0;
    }
    current.push(event);
    clusterEnd = Math.max(clusterEnd, eventEndMinutes(event));
  }

  if (current.length > 0) clusters.push(current);
  return clusters;
}

export function eventsInInterval(
  events: PlannerEvent[],
  start: number,
  end: number,
): PlannerEvent[] {
  return events.filter(
    (event) => toMinutes(event.startTime) < end && eventEndMinutes(event) > start,
  );
}

/** Assigns side-by-side columns to intersecting events. */
export function layoutEvents(events: PlannerEvent[]): PositionedPlannerEvent[] {
  return overlapClusters(events).flatMap((cluster) => {
    const columnsEnd: number[] = [];
    const positioned = cluster.map((event) => {
      let column = columnsEnd.findIndex((end) => end <= toMinutes(event.startTime));
      if (column === -1) column = columnsEnd.length;
      columnsEnd[column] = eventEndMinutes(event);
      return { ...event, column };
    });
    return positioned.map((event) => ({ ...event, columnCount: columnsEnd.length }));
  });
}

/** Groups events whose intervals intersect, keeping the DOM order chronological. */
export function groupOverlappingEvents(events: PlannerEvent[]): PlannerOverlapGroup[] {
  return overlapClusters(events).map((cluster) => {
    const endMinutes = cluster
      .filter((event) => event.endTime)
      .map((event) => toMinutes(event.endTime));
    return {
      id: cluster.map((event) => event.id).join('-'),
      events: cluster,
      startTime: cluster[0].startTime,
      endTime: endMinutes.length ? minutesToTime(Math.max(...endMinutes)) : null,
    };
  });
}
