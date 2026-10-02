import { describe, expect, it } from 'vitest';
import { PLANNER_DAY_HOUR_HEIGHT, PLANNER_DAY_SLOTS } from '@pages/schedule/constants';
import type { PlannerEvent } from '@pages/schedule/models';
import { plannerDaySegments, plannerEventGeometry } from './day-layout.utils';

function event(id: number, startTime: string, endTime: string): PlannerEvent {
  return {
    id,
    date: '2026-09-10',
    title: `Evento ${id}`,
    startTime,
    endTime,
    category: 'work',
    kind: 'event',
  };
}

describe('planner day segments', () => {
  it('renders a point once at its minute without inventing duration and excludes undated events', () => {
    const point = { ...event(1, '09:30', '10:00'), endTime: null };
    const undated = { ...point, id: 2, date: null, startTime: null };
    const segments = plannerDaySegments(PLANNER_DAY_SLOTS, [point, undated], new Set());
    expect(segments.flatMap((segment) => segment.events).map((item) => item.id)).toEqual([1]);
    expect(plannerEventGeometry(point, 9 * 60)).toEqual({
      top: PLANNER_DAY_HOUR_HEIGHT / 2,
      height: 28,
    });
  });

  it('renders a long event once and resumes at the next full hour', () => {
    const segments = plannerDaySegments(PLANNER_DAY_SLOTS, [event(1, '07:10', '12:30')], new Set());
    const condensed = segments.find((segment) => segment.kind === 'events');
    expect(condensed?.slots.map((slot) => slot.startTime)).toEqual([
      '07:00',
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
    ]);
    expect(condensed?.events.map((item) => item.id)).toEqual([1]);
    expect(segments[segments.indexOf(condensed!) + 1].slots[0].startTime).toBe('13:00');

    const expanded = plannerDaySegments(
      PLANNER_DAY_SLOTS,
      [event(1, '07:10', '12:30')],
      new Set([condensed!.id]),
    );
    expect(expanded.find((segment) => segment.id === condensed!.id)?.kind).toBe('hours');
  });

  it('uses minutes for top and height', () => {
    expect(plannerEventGeometry(event(1, '14:30', '15:30'), 14 * 60)).toEqual({
      top: PLANNER_DAY_HOUR_HEIGHT / 2,
      height: PLANNER_DAY_HOUR_HEIGHT,
    });
    expect(plannerEventGeometry(event(2, '14:15', '15:00'), 14 * 60)).toEqual({
      top: PLANNER_DAY_HOUR_HEIGHT / 4,
      height: PLANNER_DAY_HOUR_HEIGHT * 0.75,
    });
    expect(plannerEventGeometry(event(3, '14:45', '15:15'), 14 * 60)).toEqual({
      top: PLANNER_DAY_HOUR_HEIGHT * 0.75,
      height: PLANNER_DAY_HOUR_HEIGHT / 2,
    });
  });

  it('puts overlapping events in separate columns and keeps mixed durations expanded', () => {
    const segments = plannerDaySegments(
      PLANNER_DAY_SLOTS,
      [event(1, '07:10', '12:30'), event(2, '08:15', '08:45')],
      new Set(),
    );
    const occupied = segments.find((segment) => segment.events.length === 2)!;
    expect(occupied.kind).toBe('hours');
    expect(occupied.events.map((item) => [item.column, item.columnCount])).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });

  it('keeps consecutive long events in separate condensed segments', () => {
    const segments = plannerDaySegments(
      PLANNER_DAY_SLOTS,
      [event(1, '07:00', '09:00'), event(2, '09:00', '11:00')],
      new Set(),
    );
    expect(
      segments
        .filter((segment) => segment.kind === 'events')
        .map((segment) => segment.events.map((item) => item.id)),
    ).toEqual([[1], [2]]);
  });
});
