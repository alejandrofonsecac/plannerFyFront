import { describe, expect, it } from 'vitest';
import { PLANNER_DAY_SLOTS, PLANNER_PERIODS } from '@pages/schedule/constants';
import {
  eventEndMinutes,
  formatEventTime,
  formatPlannerDuration,
  isPlannerInterval,
  minutesToTime,
  periodAtHour,
  slotEndTime,
} from './time.utils';

const interval = (startTime: string | null, endTime: string | null) => ({ startTime, endTime });

describe('24-hour planner', () => {
  it('covers midnight to midnight with 24 contiguous one-hour blocks', () => {
    expect(PLANNER_DAY_SLOTS).toHaveLength(24);
    expect(PLANNER_DAY_SLOTS[0]).toEqual({ startTime: '00:00', endTime: '01:00' });
    expect(PLANNER_DAY_SLOTS[23]).toEqual({ startTime: '23:00', endTime: '24:00' });
    PLANNER_DAY_SLOTS.slice(1).forEach((slot, index) =>
      expect(slot.startTime).toBe(PLANNER_DAY_SLOTS[index].endTime),
    );
  });

  it('keeps short event times precise and rejects invalid or reversed times', () => {
    expect(isPlannerInterval(interval('00:05', '00:20'))).toBe(true);
    expect(isPlannerInterval(interval('23:45', '24:00'))).toBe(true);
    for (const [start, end] of [
      ['24:00', '24:30'],
      ['12:60', '13:00'],
      ['23:30', '00:00'],
      ['10:00', '10:00'],
    ]) {
      expect(isPlannerInterval(interval(start, end))).toBe(false);
    }
  });

  it('accepts untimed and start-only events but not an end without a start', () => {
    expect(isPlannerInterval(interval(null, null))).toBe(true);
    expect(isPlannerInterval(interval('10:00', null))).toBe(true);
    expect(isPlannerInterval(interval(null, '11:00'))).toBe(false);
  });
});

describe('event times', () => {
  it('gives a start-only event a single minute on the timeline', () => {
    expect(eventEndMinutes(interval('10:00', '11:30'))).toBe(690);
    expect(eventEndMinutes(interval('10:00', null))).toBe(601);
  });

  it('places a default one-hour block, capped at the end of the day', () => {
    expect(slotEndTime('09:00')).toBe('10:00');
    expect(slotEndTime('23:00')).toBe('24:00');
    expect(slotEndTime('23:30')).toBe('24:00');
    expect(minutesToTime(65)).toBe('01:05');
  });

  it('formats intervals, points and untimed events', () => {
    expect(formatEventTime(interval('10:00', '11:00'))).toBe('10:00 – 11:00');
    expect(formatEventTime(interval('10:00', null))).toBe('10:00 · Pontual');
    expect(formatEventTime(interval(null, null))).toBe('Sem horário');
    expect(formatPlannerDuration(90)).toBe('1h 30min');
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
