export type RecurrenceFrequency = '' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceFields {
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  completedAt?: string | null;
}

export interface RecurrenceDraft {
  frequency: RecurrenceFrequency;
  until: string;
  /** Daily repetition from Monday to Friday; only meaningful with `DAILY`. */
  weekdaysOnly?: boolean;
}

/** Day list the API accepts, together with `FREQ=DAILY`, to skip weekends. */
const WEEKDAYS_ONLY_RULE = 'BYDAY=MO,TU,WE,TH,FR';

export const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: '', label: 'Não repetir' },
  { value: 'DAILY', label: 'Todo dia' },
  { value: 'WEEKLY', label: 'Toda semana' },
  { value: 'MONTHLY', label: 'Todo mês' },
  { value: 'YEARLY', label: 'Todo ano' },
];

/** Serializes the user's choice; occurrence dates are generated only by the API. */
export function recurrencePayload(draft: RecurrenceDraft): RecurrenceFields {
  const weekdays =
    draft.frequency === 'DAILY' && draft.weekdaysOnly ? `;${WEEKDAYS_ONLY_RULE}` : '';
  return {
    isRecurring: !!draft.frequency,
    recurrenceRule: draft.frequency
      ? `FREQ=${draft.frequency}${weekdays};UNTIL=${draft.until.replaceAll('-', '')}`
      : '',
  };
}

export function recurrenceLabel(item: RecurrenceFields): string {
  if (item.recurrenceRule?.split(';').includes(WEEKDAYS_ONLY_RULE)) return 'Dias úteis';
  const frequency = item.recurrenceRule?.match(/(?:^|;)FREQ=([^;]+)/)?.[1];
  return (
    RECURRENCE_OPTIONS.find((option) => option.value === frequency)?.label ??
    (item.isRecurring || item.recurrenceRule ? 'Recorrente' : 'Não repetir')
  );
}

export function recurrenceFormError(draft: RecurrenceDraft, start: string): string {
  if (!draft.frequency) return '';
  if (!start) return 'Escolha a data da primeira ocorrência.';
  if (!draft.until || draft.until < start)
    return 'Escolha uma data final igual ou posterior à primeira ocorrência.';
  return '';
}
