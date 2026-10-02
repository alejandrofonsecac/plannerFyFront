import type { Habit, HabitHistoryDay } from '../models/habit';

export interface HeatmapDay extends HabitHistoryDay {
  label: string;
}

const SHORT_DATE = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });

/** Formats the scheduled history supplied by the API, without inferring practice dates. */
export function formatHabitHistory(habit: Habit): HeatmapDay[] {
  return (habit.history ?? []).slice(-30).map((day) => {
    const [year, month, date] = day.date.split('-').map(Number);
    const civilDate = new Date(Date.UTC(year, month - 1, date));
    const parts = SHORT_DATE.formatToParts(civilDate);
    const shortDate = `${parts.find((part) => part.type === 'day')?.value} ${parts.find((part) => part.type === 'month')?.value.replace('.', '')}`;
    const name = day.date === habit.asOfDate ? 'Hoje' : WEEKDAY.format(civilDate);
    return { ...day, label: `${name} (${shortDate})` };
  });
}
