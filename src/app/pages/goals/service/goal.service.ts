import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, Subscription } from 'rxjs';
import { ApiClient } from '../../../core/data-access/api-client.service';
import {
  Goal,
  GoalRequest,
  GoalFilters,
  GoalsBoard,
  WeeklyFocus,
} from '../../../shared/goals/goal.models';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly api = inject(ApiClient);
  private filters: GoalFilters = {};
  private pendingLoad?: Subscription;
  readonly board = signal<GoalsBoard | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  load(filters: GoalFilters = this.filters): void {
    this.filters = filters;
    this.pendingLoad?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pendingLoad = this.api.get<GoalsBoard>(this.boardPath()).subscribe({
      next: (board) => {
        this.board.set(board);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as metas. Tente novamente.');
      },
    });
  }

  create(request: GoalRequest): Promise<boolean> {
    return this.mutate(this.api.post<Goal, GoalRequest>('goals', request));
  }
  update(id: number, request: GoalRequest): Promise<boolean> {
    return this.mutate(this.api.put<Goal, GoalRequest>('goals', id, request));
  }
  complete(id: number): Promise<boolean> {
    return this.mutate(this.api.post<Goal, null>('goals/' + id + '/complete', null));
  }
  defer(id: number): Promise<boolean> {
    return this.mutate(this.api.post<Goal, null>('goals/' + id + '/defer', null));
  }
  saveFocus(weekId: string, focus: WeeklyFocus): Promise<boolean> {
    return this.mutate(this.api.put<WeeklyFocus, WeeklyFocus>('goals/focus', weekId, focus));
  }

  private boardPath(): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(this.filters)) {
      if (value) query.set(key, value);
    }
    return 'goals/board' + (query.size ? '?' + query.toString() : '');
  }

  private async mutate(request: Observable<unknown>): Promise<boolean> {
    if (this.saving()) return false;
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(request);
    } catch (failure) {
      this.error.set(
        failure instanceof HttpErrorResponse && typeof failure.error?.message === 'string'
          ? failure.error.message
          : 'Não foi possível salvar. Tente novamente.',
      );
      this.saving.set(false);
      return false;
    }
    // Reload the server's summary, filters and actions after every successful command.
    // A reload failure must not suggest that a successful POST should be repeated.
    this.saving.set(false);
    this.load();
    return true;
  }
}
