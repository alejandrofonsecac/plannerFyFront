import { describe, expect, it } from 'vitest';
import { summarizePlannerDay, hasPlannerConflict } from '@pages/schedule/utils';
import type { PlannerEvent } from '@pages/schedule/models';

describe('planner summary', () => {
  const event: PlannerEvent = {
    id: 1,
    title: 'Reunião',
    date: '2026-09-10',
    startTime: '09:00',
    endTime: '10:00',
    category: 'work',
    kind: 'event',
  };
  it('preserves daily counts and unique occupied-hour metrics', () => {
    const summary = summarizePlannerDay(
      event.date,
      [
        event,
        { ...event, id: 2, kind: 'task', startTime: '09:15' },
        { ...event, id: 3, date: '2026-09-11' },
      ],
      3,
    );
    expect(summary.taskCount).toBe(4);
    expect(summary.eventCount).toBe(1);
    expect(summary.plannedHours).toBe('1h');
    expect(summary.freeTime).toBe('23h');
    expect(summary.availability.occupiedBlocks).toBe(1);
  });
  it('allows adjacent intervals and ignores different dates', () => {
    expect(hasPlannerConflict([event], { ...event, startTime: '10:00', endTime: '11:00' })).toBe(
      false,
    );
    expect(hasPlannerConflict([event], { ...event, date: '2026-09-11' })).toBe(false);
  });
});
