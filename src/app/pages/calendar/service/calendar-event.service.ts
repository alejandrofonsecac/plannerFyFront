import { recurrenceRequestError } from '@app/shared/recurrence/recurrence-error';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { ApiClient, withoutId } from '../../../core/data-access/api-client.service';
import { CalendarEvent, CalendarEventDraft } from '../models';

@Injectable({ providedIn: 'root' })
export class CalendarEventService {
  private readonly api = inject(ApiClient);
  private pendingLoad?: Subscription;

  readonly events = signal<CalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.pendingLoad?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pendingLoad = this.api.getAll<CalendarEvent>('calendar/events').subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar o calendário. Tente novamente.');
      },
    });
  }

  create(draft: CalendarEventDraft): Promise<boolean> {
    return this.mutate(this.api.post('events', draft));
  }

  update(event: CalendarEvent): Promise<boolean> {
    return this.mutate(this.api.put('events', event.id, withoutId(event)));
  }

  remove(id: CalendarEvent['id']): Promise<boolean> {
    return this.mutate(this.api.delete('events', id));
  }

  private async mutate(request: Observable<unknown>): Promise<boolean> {
    if (this.saving()) return false;
    this.saving.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(request);
      this.load();
      return true;
    } catch (error) {
      this.error.set(recurrenceRequestError(error));
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
