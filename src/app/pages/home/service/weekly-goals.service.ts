import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ApiClient } from '../../../core/data-access/api-client.service';
import { GoalApiResponse } from '../../../core/data-access/goals-api';
import { WeeklyGoal } from '../models/weekly-goal';

@Injectable()
export class WeeklyGoalsService {
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly goalsState = signal<WeeklyGoal[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly goals = this.goalsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): void {
    if (this.loadingState()) {
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);
    this.goalsState.set([]);

    this.api
      .getAll<GoalApiResponse>('goals')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (goals) =>
          this.goalsState.set(
            goals.map((goal) => ({
              id: goal.id,
              title: goal.name,
              description: goal.expectedTarget,
              priority: goal.priority,
              category: goal.category,
              habitId: goal.habitId,
            })),
          ),
        error: () => this.errorState.set('Não foi possível carregar as metas semanais.'),
      });
  }
}
