import { Injectable, inject } from '@angular/core';
import { PreferenceStore } from '../core/preferences/preference-store.service';
import { isIntegerBetween, oneOf } from '../core/preferences/model/preference-values';

export type PlannerDisplay = 'compact' | 'periods' | 'radial';

/** Hidden overnight hours; `start` and `end` are whole hours and may wrap past midnight. */
export interface PlannerSleepSchedule {
  enabled: boolean;
  start: number;
  end: number;
}

const STORAGE_KEY = 'plannerfy-planner-display';
const SLEEP_STORAGE_KEY = 'plannerfy-planner-sleep';
const DEFAULT_SLEEP: PlannerSleepSchedule = { enabled: false, start: 23, end: 7 };

@Injectable({ providedIn: 'root' })
export class PlannerViewService {
  readonly options = [
    {
      id: 'compact',
      label: 'Compacta',
      description: 'Padrão · Horários livres recolhidos, compromissos em destaque.',
    },
    {
      id: 'periods',
      label: 'Por período',
      description: 'Madrugada, manhã, tarde e noite. Acompanha a hora local.',
    },
    {
      id: 'radial',
      label: 'Circular',
      description: 'As 24 horas em um círculo, com os eventos ao alcance da mão.',
    },
  ] as const;
  // Preferências da conta: veja docs/USER_PREFERENCES.md.
  private readonly preferences = inject(PreferenceStore);
  private readonly displayPreference = this.preferences.define<PlannerDisplay>({
    key: 'plannerDisplay',
    defaultValue: 'compact',
    parse: oneOf(this.options.map((option) => option.id)),
    storageKey: STORAGE_KEY,
  });
  private readonly sleepPreference = this.preferences.define<PlannerSleepSchedule>({
    key: 'sleep',
    defaultValue: DEFAULT_SLEEP,
    parse: parseSleep,
    storageKey: SLEEP_STORAGE_KEY,
  });

  readonly display = this.displayPreference.value;
  readonly sleep = this.sleepPreference.value;

  setDisplay(display: PlannerDisplay): void {
    this.displayPreference.set(display);
  }

  updateSleep(changes: Partial<PlannerSleepSchedule>): void {
    this.sleepPreference.set({ ...this.sleep(), ...changes });
  }

  /** Whether the hour starting at `hour` falls within the configured sleep window. */
  isSleepHour(hour: number): boolean {
    const { enabled, start, end } = this.sleep();
    if (!enabled || start === end) return false;
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
  }
}

/** Aceita horários parciais, completando com o padrão. */
function parseSleep(value: unknown): PlannerSleepSchedule | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const saved = value as Partial<Record<keyof PlannerSleepSchedule, unknown>>;
  const hour = (candidate: unknown, fallback: number) =>
    isIntegerBetween(candidate, 0, 23) ? candidate : fallback;
  return {
    enabled: saved.enabled === true,
    start: hour(saved.start, DEFAULT_SLEEP.start),
    end: hour(saved.end, DEFAULT_SLEEP.end),
  };
}
