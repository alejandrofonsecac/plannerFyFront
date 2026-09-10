import { Injectable, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/data-access/api-client.service';
import { PlannerHabit } from '../models';

@Injectable()
export class HabitExecutionService {
  private readonly api = inject(ApiClient);
  private pendingLoad?: Subscription;
  private date = '';
  readonly habits = signal<PlannerHabit[]>([]);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  load(date: string): void {
    this.date = date;
    this.pendingLoad?.unsubscribe();
    this.habits.set([]);
    this.error.set(null);
    this.pendingLoad = this.api
      .get<PlannerHabit[]>('habit/planner?date=' + encodeURIComponent(date))
      .subscribe({
        next: (habits) => this.habits.set(habits),
        error: () => this.error.set('Não foi possível carregar os hábitos. Tente novamente.'),
      });
  }

  async toggle(id: number): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.post(
          'habit/' + id + '/completions/' + encodeURIComponent(this.date) + '/toggle',
          null,
        ),
      );
      this.load(this.date);
    } catch {
      this.error.set('Não foi possível registrar a execução do hábito.');
    } finally {
      this.saving.set(false);
    }
  }
}
