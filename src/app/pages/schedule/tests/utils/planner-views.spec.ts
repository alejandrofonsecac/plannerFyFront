import { describe, expect, it } from 'vitest';
import type { PlannerEvent } from '@pages/schedule/models';
import { PLANNER_DAY_SLOTS, PLANNER_PERIODS } from '@pages/schedule/constants';
import {
  getPlannerDayAvailability,
  isPlannerInterval,
  isPlannerTimeSlot,
  eventsInInterval,
  hourAtPoint,
  pointOnClock,
  periodAtHour,
  radialGroups,
} from '@pages/schedule/utils';

const event = (id: number, startTime: string, endTime: string): PlannerEvent => ({
  id,
  startTime,
  endTime,
  title: 'Compromisso',
  date: '2026-09-10',
  category: 'work',
  kind: 'event',
});

describe('24-hour planner', () => {
  it('covers midnight to midnight with 24 contiguous one-hour blocks', () => {
    expect(PLANNER_DAY_SLOTS).toHaveLength(24);
    expect(PLANNER_DAY_SLOTS[0]).toEqual({ startTime: '00:00', endTime: '01:00' });
    expect(PLANNER_DAY_SLOTS[23]).toEqual({ startTime: '23:00', endTime: '24:00' });
    PLANNER_DAY_SLOTS.slice(1).forEach((slot, index) =>
      expect(slot.startTime).toBe(PLANNER_DAY_SLOTS[index].endTime),
    );
    expect(isPlannerTimeSlot(PLANNER_DAY_SLOTS[23])).toBe(true);
  });

  it('keeps short event times precise and rejects invalid or reversed times', () => {
    expect(isPlannerInterval(event(1, '00:05', '00:20'))).toBe(true);
    expect(isPlannerInterval(event(1, '23:45', '24:00'))).toBe(true);
    for (const [start, end] of [
      ['24:00', '24:30'],
      ['12:60', '13:00'],
      ['23:30', '00:00'],
      ['10:00', '10:00'],
    ]) {
      expect(isPlannerInterval(event(1, start, end))).toBe(false);
    }
  });

  it('counts occupied blocks once even with overlaps, partial hours and a midnight end', () => {
    const availability = getPlannerDayAvailability('2026-09-10', [
      event(1, '00:15', '00:30'),
      event(2, '00:20', '01:10'),
      event(3, '23:00', '24:00'),
      { ...event(4, '10:00', '11:00'), date: '2026-09-11' },
    ]);
    expect(availability.totalBlocks).toBe(24);
    expect(availability.occupiedBlocks).toBe(3);
    expect(availability.availableBlocks).toBe(21);
    expect(eventsInInterval([event(1, '06:45', '07:15')], 420, 480)).toHaveLength(1);
    expect(eventsInInterval([event(1, '06:00', '07:00')], 420, 480)).toHaveLength(0);
  });
});

describe('local day periods', () => {
  it('assigns each of the 24 hours exactly once without gaps', () => {
    for (let hour = 0; hour < 24; hour++) {
      const matches = PLANNER_PERIODS.filter((period) => hour >= period.start && hour < period.end);
      expect(matches).toHaveLength(1);
      expect(periodAtHour(hour)).toEqual(matches[0]);
    }
    expect([6, 7, 12, 13, 18, 19, 23, 0].map((hour) => periodAtHour(hour).id)).toEqual([
      'dawn',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'night',
      'night',
      'dawn',
    ]);
  });
});

describe('radial projection', () => {
  it('snaps every hour correctly, including both sides of midnight', () => {
    for (let hour = 0; hour < 24; hour++) {
      const point = pointOnClock(hour * 15);
      expect(hourAtPoint(point.x - 170, point.y - 170)).toBe(hour);
    }
    for (const degrees of [-7, 7, 353, 359]) {
      const point = pointOnClock(degrees);
      expect(hourAtPoint(point.x - 170, point.y - 170)).toBe(0);
    }
  });

  it('renders a minimum eight-degree slice without rounding the saved interval', () => {
    const short = event(1, '09:05', '09:20');
    const [group] = radialGroups([short]);
    expect(group.sweep).toBe(8);
    expect(group.events[0]).toEqual(short);
    expect(group.startTime).toBe('09:05');
    expect(group.endTime).toBe('09:20');
  });

  it('groups intersecting events but keeps adjacent events separate', () => {
    const groups = radialGroups([
      event(1, '09:00', '10:00'),
      event(2, '09:30', '10:15'),
      event(3, '10:15', '11:00'),
    ]);
    expect(groups.map((group) => group.events.length)).toEqual([2, 1]);
    expect(groups[0].endTime).toBe('10:15');
  });

  it('renders a full-day event without an empty arc', () => {
    const [group] = radialGroups([event(1, '00:00', '24:00')]);
    expect(group.sweep).toBe(360);
    expect(group.path).not.toContain('NaN');
    expect(group.path).not.toContain('Infinity');
  });
});
