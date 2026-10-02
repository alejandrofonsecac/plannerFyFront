import { describe, expect, it } from 'vitest';
import type { PlannerEvent } from '@pages/schedule/models';
import { eventsInInterval, groupOverlappingEvents, layoutEvents } from './event-layout.utils';

const event = (id: number, startTime: string | null, endTime: string | null): PlannerEvent => ({
  id,
  startTime,
  endTime,
  title: 'Compromisso',
  date: '2026-09-10',
  category: 'work',
  kind: 'event',
});

describe('event layout', () => {
  it('selects events that intersect an interval', () => {
    expect(eventsInInterval([event(1, '06:45', '07:15')], 420, 480)).toHaveLength(1);
    expect(eventsInInterval([event(1, '06:00', '07:00')], 420, 480)).toHaveLength(0);
  });

  it('treats a start-only event as occupying its starting minute', () => {
    expect(eventsInInterval([event(1, '07:00', null)], 420, 480)).toHaveLength(1);
    expect(eventsInInterval([event(1, '08:00', null)], 420, 480)).toHaveLength(0);
    expect(eventsInInterval([event(1, '06:30', null)], 420, 480)).toHaveLength(0);
  });

  it('puts a point and an event starting at the same minute side by side', () => {
    const positioned = layoutEvents([event(1, '10:00', '11:00'), event(2, '10:00', null)]);
    expect(positioned.map(({ column, columnCount }) => [column, columnCount])).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });

  it('ignores untimed events and does not invent an end for point-only groups', () => {
    const groups = groupOverlappingEvents([event(1, '09:00', null), event(2, null, null)]);
    expect(groups).toEqual([
      expect.objectContaining({ id: '1', startTime: '09:00', endTime: null }),
    ]);
  });

  it('ends a mixed group at the latest real end', () => {
    const [group] = groupOverlappingEvents([event(1, '09:00', '10:00'), event(2, '09:30', null)]);
    expect(group.endTime).toBe('10:00');
  });
});
