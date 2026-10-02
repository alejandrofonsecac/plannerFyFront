export type HabitFrequencyType = 'daily' | 'weekdays' | 'custom';
export type HabitStatus = 'active' | 'paused';

export interface Habit {
  id: number;
  name: string;
  icon: string;
  categoryId: string;
  frequencyType: HabitFrequencyType;
  time?: string;
  goal?: string;
  note?: string;
  status: HabitStatus;
  completedDates: string[];
  createdAt: string;
  asOfDate: string;
  metrics: HabitMetrics;
  daysOfWeek: number[];
  history: HabitHistoryDay[];
}

export interface HabitHistoryDay {
  date: string;
  completed: boolean;
}

export const HABIT_WEEKDAYS = [
  { value: 1, short: 'Seg', label: 'Segunda-feira' },
  { value: 2, short: 'Ter', label: 'Terça-feira' },
  { value: 3, short: 'Qua', label: 'Quarta-feira' },
  { value: 4, short: 'Qui', label: 'Quinta-feira' },
  { value: 5, short: 'Sex', label: 'Sexta-feira' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 7, short: 'Dom', label: 'Domingo' },
] as const;

export interface HabitDraft {
  name: string;
  icon: string;
  categoryId: string;
  frequencyType: HabitFrequencyType;
  time: string;
  goal: string;
  note: string;
  daysOfWeek?: number[];
}

export interface HabitMetrics {
  currentStreak: number;
  bestStreak: number;
  consistency: number;
  completedDays: number;
  milestone: number | null;
}

export interface HabitSummary {
  activeCount: number;
  highestCurrentStreak: number;
  accumulatedDays: number;
  averageConsistency: number;
}

export interface HabitBoard {
  habits: Habit[];
  summary: HabitSummary;
}

export function emptyHabitDraft(): HabitDraft {
  return {
    name: '',
    icon: 'self_improvement',
    categoryId: 'saude',
    frequencyType: 'daily',
    time: '',
    goal: '',
    note: '',
    daysOfWeek: [],
  };
}

export function habitToDraft(habit: Habit): HabitDraft {
  return {
    name: habit.name,
    icon: habit.icon,
    categoryId: habit.categoryId,
    frequencyType: habit.frequencyType === 'weekdays' ? 'custom' : habit.frequencyType,
    time: habit.time ?? '',
    goal: habit.goal ?? '',
    note: habit.note ?? '',
    daysOfWeek: habit.frequencyType === 'weekdays' ? [1, 2, 3, 4, 5] : [...habit.daysOfWeek],
  };
}
