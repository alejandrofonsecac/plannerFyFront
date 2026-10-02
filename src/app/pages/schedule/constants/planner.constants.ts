import type {
  PlannerCategory,
  PlannerEventPriority,
  PlannerTimeSlot,
} from '@pages/schedule/models';

export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;
export const MINUTES_PER_DAY = 24 * 60;
export const PLANNER_SLOT_DURATION_MINUTES = 60;
export const PLANNER_SLOT_COUNT = DAY_END_HOUR - DAY_START_HOUR;

/** Timeline footprint of an event without an end, so it collides with same-minute events. */
export const POINT_EVENT_MINUTES = 1;
export const POINT_EVENT_HEIGHT = 28;

export const PLANNER_DAY_HOUR_HEIGHT = 88;
export const PLANNER_CONDENSE_MINUTES = 2 * PLANNER_SLOT_DURATION_MINUTES;
export const PLANNER_SHORT_EVENT_MINUTES = 45;

export const PLANNER_DAY_SLOTS: readonly PlannerTimeSlot[] = Array.from(
  { length: PLANNER_SLOT_COUNT },
  (_, index) => {
    const startHour = DAY_START_HOUR + index;
    return {
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${(startHour + 1).toString().padStart(2, '0')}:00`,
    };
  },
);

// The labels refer to starting hours: 06:00 belongs to madrugada, 07:00 to manhã.
export const PLANNER_PERIODS = [
  { id: 'dawn', label: 'Madrugada', range: '00–06h', start: 0, end: 7 },
  { id: 'morning', label: 'Manhã', range: '07–12h', start: 7, end: 13 },
  { id: 'afternoon', label: 'Tarde', range: '13–18h', start: 13, end: 19 },
  { id: 'night', label: 'Noite', range: '19–24h', start: 19, end: 24 },
] as const;

export const PLANNER_CATEGORY_LABELS: Readonly<Record<PlannerCategory, string>> = {
  work: 'Trabalho',
  study: 'Estudos',
  personal: 'Pessoal',
  health: 'Saúde',
  event: 'Evento',
  habit: 'Hábito',
};

export const PLANNER_EVENT_PRIORITIES: readonly PlannerEventPriority[] = [
  'Alta',
  'Média',
  'Normal',
];
