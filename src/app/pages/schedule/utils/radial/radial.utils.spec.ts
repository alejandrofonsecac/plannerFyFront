import { describe, expect, it } from 'vitest';
import type { PlannerEvent } from '@pages/schedule/models';
import { hourAtPoint, pointOnClock, radialGroups } from './radial.utils';

const event = (id: number, startTime: string, endTime: string | null): PlannerEvent => ({
  id,
  startTime,
  endTime,
  title: 'Compromisso',
  date: '2026-09-10',
  category: 'work',
  kind: 'event',
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

  it('renders a point event as a minimum slice without NaN', () => {
    const [group] = radialGroups([event(1, '09:00', null)]);
    expect(group.sweep).toBe(8);
    expect(group.path).not.toContain('NaN');
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
