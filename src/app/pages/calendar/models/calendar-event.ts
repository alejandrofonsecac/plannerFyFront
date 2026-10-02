import type { RecurrenceFields } from '@app/shared/recurrence/recurrence.model';

export type CalendarEventSource = 'internal' | 'google';

export type CalendarEventCategory = 'work' | 'study' | 'personal' | 'health' | 'event' | 'habit';

export interface CalendarEvent extends RecurrenceFields {
  id: number | string;
  readOnly?: boolean;
  title: string;
  date: string | null;
  completed?: boolean;
  completedAt?: string | null;
  priority?: 'Alta' | 'Média' | 'Normal' | null;
  startTime: string | null;
  endTime: string | null;
  description: string;
  location?: string;
  source: CalendarEventSource;
  category: CalendarEventCategory;
}

export type CalendarEventDraft = Omit<CalendarEvent, 'id' | 'readOnly'>;
