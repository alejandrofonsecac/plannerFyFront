import { describe, expect, it } from 'vitest';
import { dateKey, parseLocalDate } from './date.utils';

describe('local calendar dates', () => {
  it('preserves the selected calendar day without interpreting it as UTC', () => {
    const date = parseLocalDate('2026-09-12')!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(12);
    expect(dateKey(date)).toBe('2026-09-12');
  });
  it('rejects malformed and impossible dates but supports leap days', () => {
    for (const value of ['', '2026-02-30', '2026-02-29', '2026-13-01', '2026-00-01', '0000-01-01'])
      expect(parseLocalDate(value)).toBeNull();
    expect(dateKey(parseLocalDate('2024-02-29')!)).toBe('2024-02-29');
  });
});
