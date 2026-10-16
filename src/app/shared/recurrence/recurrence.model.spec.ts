import { describe, expect, it } from 'vitest';
import { recurrenceLabel, recurrencePayload } from './recurrence.model';

describe('recurrence contract', () => {
  it('sends the weekdays-only day list with daily repetition', () => {
    expect(
      recurrencePayload({ frequency: 'DAILY', until: '2030-01-31', weekdaysOnly: true }),
    ).toEqual({
      isRecurring: true,
      recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20300131',
    });
    expect(recurrencePayload({ frequency: 'DAILY', until: '2030-01-31' }).recurrenceRule).toBe(
      'FREQ=DAILY;UNTIL=20300131',
    );
  });

  it('ignores weekdays only for other frequencies and when not repeating', () => {
    expect(
      recurrencePayload({ frequency: 'WEEKLY', until: '2030-01-31', weekdaysOnly: true })
        .recurrenceRule,
    ).toBe('FREQ=WEEKLY;UNTIL=20300131');
    expect(recurrencePayload({ frequency: '', until: '', weekdaysOnly: true })).toEqual({
      isRecurring: false,
      recurrenceRule: '',
    });
  });

  it('labels weekdays-only occurrences returned by the API', () => {
    expect(
      recurrenceLabel({
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20300131',
      }),
    ).toBe('Dias úteis');
    expect(
      recurrenceLabel({ isRecurring: true, recurrenceRule: 'FREQ=DAILY;UNTIL=20300131' }),
    ).toBe('Todo dia');
  });
});
