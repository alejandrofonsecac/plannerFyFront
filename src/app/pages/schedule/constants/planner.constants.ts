import type { PlannerTimeSlot } from '@pages/schedule/models';

export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;
export const PLANNER_SLOT_DURATION_MINUTES = 60;
export const PLANNER_SLOT_COUNT = DAY_END_HOUR - DAY_START_HOUR;
export const PIXELS_PER_MINUTE = 2;

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
