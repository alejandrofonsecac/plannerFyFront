import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ApiClient } from '../../../core/data-access/api-client.service';
import { Goal, GoalsBoard } from '../../../shared/goals/goal.models';

@Injectable()
export class WeeklyGoalsService {
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly goalsState = signal<Goal[]>([]);
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
      .get<GoalsBoard>('goals/board')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (board) => this.goalsState.set(board.goals),
        error: () => this.errorState.set('Não foi possível carregar as metas semanais.'),
      });
  }
}
