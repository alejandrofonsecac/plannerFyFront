import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiClient, withoutId } from '@app/core/data-access/api-client.service';
import type { PlannerDaySummary, PlannerEvent, PlannerEventDraft } from '@pages/schedule/models';

const EVENTS_RESOURCE = 'planner/events';

/** Planner data access: signals change only after the API confirms each write. */
@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly api = inject(ApiClient);
  private pendingLoad?: Subscription;

  readonly events = signal<PlannerEvent[]>([]);
  readonly undatedEvents = computed(() => this.events().filter((event) => event.date === null));
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<PlannerDaySummary | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.pendingLoad?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pendingLoad = this.api.getAll<PlannerEvent>(EVENTS_RESOURCE).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar o planejamento. Tente novamente.');
      },
    });
  }

  loadSummary(date: string): void {
    this.api.get<PlannerDaySummary>(`planner/summary?date=${encodeURIComponent(date)}`).subscribe({
      next: (summary) => this.summary.set(summary),
      error: () =>
        this.error.set('Não foi possível carregar o resumo do planejamento. Tente novamente.'),
    });
  }

  async createEvent(draft: PlannerEventDraft): Promise<PlannerEvent> {
    const created = await firstValueFrom(
      this.api.post<PlannerEvent, PlannerEventDraft>(EVENTS_RESOURCE, {
        ...draft,
        source: draft.source ?? 'internal',
      }),
    );
    this.events.update((items) => [...items, created]);
    // Creation returns the first occurrence; fetch the remaining dates from the API.
    if (created.isRecurring || created.recurrenceRule) this.load();
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
}
