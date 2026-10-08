import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

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
  private readonly document = inject(DOCUMENT);
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
  readonly display = signal<PlannerDisplay>(this.read());
  readonly sleep = signal<PlannerSleepSchedule>(this.readSleep());

  setDisplay(display: PlannerDisplay): void {
    this.display.set(display);
    this.write(STORAGE_KEY, display);
  }

  updateSleep(changes: Partial<PlannerSleepSchedule>): void {
    this.sleep.update((sleep) => ({ ...sleep, ...changes }));
    this.write(SLEEP_STORAGE_KEY, JSON.stringify(this.sleep()));
  }

  /** Whether the hour starting at `hour` falls within the configured sleep window. */
  isSleepHour(hour: number): boolean {
    const { enabled, start, end } = this.sleep();
    if (!enabled || start === end) return false;
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
  }

  private write(key: string, value: string): void {
    try {
      this.document.defaultView?.localStorage.setItem(key, value);
    } catch {
      /* A preferência continua ativa quando o armazenamento está indisponível. */
    }
  }

  private readSleep(): PlannerSleepSchedule {
    try {
      const saved = JSON.parse(
        this.document.defaultView?.localStorage.getItem(SLEEP_STORAGE_KEY) ?? 'null',
      ) as Partial<PlannerSleepSchedule> | null;
      const hour = (value: unknown, fallback: number) =>
        Number.isInteger(value) && (value as number) >= 0 && (value as number) < 24
          ? (value as number)
          : fallback;
      return {
        enabled: saved?.enabled === true,
        start: hour(saved?.start, DEFAULT_SLEEP.start),
        end: hour(saved?.end, DEFAULT_SLEEP.end),
      };
    } catch {
      return DEFAULT_SLEEP;
    }
  }

  private read(): PlannerDisplay {
    try {
      const saved = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return this.options.find((option) => option.id === saved)?.id ?? 'compact';
    } catch {
      return 'compact';
    }
  }
}
