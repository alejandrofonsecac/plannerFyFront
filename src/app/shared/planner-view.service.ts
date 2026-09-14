import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type PlannerDisplay = 'compact' | 'periods' | 'radial';

const STORAGE_KEY = 'plannerfy-planner-display';

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
      description: 'As 24 horas em um círculo, com as tarefas ao alcance da mão.',
    },
  ] as const;
  readonly display = signal<PlannerDisplay>(this.read());

  setDisplay(display: PlannerDisplay): void {
    this.display.set(display);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, display);
    } catch {
      /* A preferência continua ativa quando o armazenamento está indisponível. */
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
