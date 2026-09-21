export type CalendarEventSource = 'internal' | 'google';

export type CalendarEventCategory = 'work' | 'study' | 'personal' | 'health' | 'event' | 'habit';

export interface CalendarEvent {
  id: number | string;
  readOnly?: boolean;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location?: string;
  source: CalendarEventSource;
  category: CalendarEventCategory;
}

export type CalendarEventDraft = Omit<CalendarEvent, 'id' | 'readOnly'>;
