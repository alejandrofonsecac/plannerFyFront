import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { ApiClient } from '../../../core/data-access/api-client.service';
import type { Habit, HabitBoard, HabitDraft, HabitSummary } from '../models/habit';

@Injectable({ providedIn: 'root' })
export class HabitService {
  private readonly api = inject(ApiClient);

  private pendingLoad?: Subscription;
  readonly habits = signal<Habit[]>([]);
  readonly summary = signal<HabitSummary | null>(null);
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
    this.pendingLoad = this.api.get<HabitBoard>('habits/board').subscribe({
      next: (board) => {
        this.habits.set(board.habits);
        this.summary.set(board.summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os hábitos. Tente novamente.');
      },
    });
  }

  create(draft: HabitDraft): Promise<boolean> {
    return this.mutate(this.api.post('habits', draft));
  }

  update(id: number, draft: HabitDraft): Promise<boolean> {
    return this.mutate(this.api.put('habits', id, draft));
  }

  remove(id: number): Promise<boolean> {
    return this.mutate(this.api.delete('habits', id));
  }

  toggleStatus(id: number): Promise<boolean> {
    const habit = this.habits().find((item) => item.id === id);
    if (!habit) return Promise.resolve(false);
    return this.mutate(
      this.api.put('habits', `${id}/status`, {
        status: habit.status === 'active' ? 'paused' : 'active',
      }),
    );
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
      const messages: Record<number, string> = {
        400: 'Revise os dados e escolha pelo menos um dia para a frequência definida.',
        401: 'Sua sessão expirou. Entre novamente para continuar.',
        403: 'Você não tem permissão para alterar este hábito.',
        404: 'Este hábito não está mais disponível. Atualize a página.',
        409: 'Não foi possível alterar este hábito agora. Atualize a página e tente novamente.',
      };
      this.error.set(
        (error instanceof HttpErrorResponse && messages[error.status]) ||
          'Não foi possível salvar o hábito. Seus dados foram mantidos; tente novamente.',
      );
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
