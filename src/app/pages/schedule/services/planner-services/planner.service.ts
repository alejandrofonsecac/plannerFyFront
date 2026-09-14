import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, firstValueFrom, of } from 'rxjs';
import { ApiClient, withoutId } from '@app/core/data-access/api-client.service';
import { DemoDataStore } from '@app/core/data-access/demo-data-store.service';
import type {
  PlannerCategory,
  PlannerEvent,
  PlannerEventDraft,
  PlannerTask,
  Task,
} from '@pages/schedule/models';
import { dateKey } from '@pages/schedule/utils';
import {
  SCHEDULE_TASKS_LIST_RESOURCE,
  SCHEDULE_TASKS_RESOURCE,
} from '@pages/schedule/services/schedule-tasks.endpoints';

const EVENTS_RESOURCE = 'planner/events';
const DEFAULT_TASK_CATEGORY: PlannerCategory = 'personal';

function toPlannerTask(task: Task): PlannerTask {
  return {
    id: task.id,
    title: task.title,
    category: DEFAULT_TASK_CATEGORY,
  };
}

function createDemoEvent(): PlannerEvent {
  return {
    id: 1,
    date: dateKey(new Date()),
    title: 'Exemplo de compromisso',
    description: 'Evento de demonstração exibido somente sem dados da API.',
    startTime: '09:00',
    endTime: '10:00',
    category: 'personal',
    kind: 'event',
  };
}

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly api = inject(ApiClient);
  private readonly demoDataStore = inject(DemoDataStore);

  readonly events = signal<PlannerEvent[]>([]);
  readonly unscheduledTasks = signal<PlannerTask[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadEvents();
    this.loadUnscheduledTasks();
  }

  async createEvent(
    draft: PlannerEventDraft,
    kind: PlannerEvent['kind'] = 'event',
  ): Promise<PlannerEvent> {
    const created = await firstValueFrom(
      this.api.post<PlannerEvent, Omit<PlannerEvent, 'id'>>(EVENTS_RESOURCE, { ...draft, kind }),
    );
    this.events.update((items) => [...items, created]);
    return created;
  }

  async updateEvent(event: PlannerEvent): Promise<PlannerEvent> {
    const updated = await firstValueFrom(
      this.api.put<PlannerEvent, Omit<PlannerEvent, 'id'>>(
        EVENTS_RESOURCE,
        event.id,
        withoutId(event),
      ),
    );
    this.events.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }

  async removeEvent(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(EVENTS_RESOURCE, id));
    this.events.update((items) => items.filter((item) => item.id !== id));
  }

  async removeUnscheduledTask(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(SCHEDULE_TASKS_RESOURCE, id));
    this.unscheduledTasks.update((items) => items.filter((item) => item.id !== id));
  }

  private loadEvents(): void {
    this.api
      .getAll<PlannerEvent>(EVENTS_RESOURCE)
      .pipe(catchError(() => of([])))
      .subscribe((events) => {
        this.events.set(
          events.length
            ? events
            : this.demoDataStore.getOrCreateList('planner-events', createDemoEvent),
        );
      });
  }

  private loadUnscheduledTasks(): void {
    this.api
      .getAll<Task>(SCHEDULE_TASKS_LIST_RESOURCE)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((tasks) => this.unscheduledTasks.set(tasks.map(toPlannerTask)));
  }
}
