import type { SchedulingResult, PlannerEvent, PlannerEventDraft } from '@pages/schedule/models';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { PlannerService } from './planner.service';

@Injectable({ providedIn: 'root' })
export class PlannerSchedulingService {
  private readonly planner = inject(PlannerService);
  private readonly saving = signal(false);
  readonly busy = this.saving.asReadonly();

  createEvent(draft: PlannerEventDraft): Promise<SchedulingResult> {
    return this.run(
      async () =>
        ({ status: 'saved', event: await this.planner.createEvent(draft) }),
    );
  }

  updateEvent(event: PlannerEvent): Promise<SchedulingResult> {
    return this.run(
      async () =>
        ({
          status: 'saved',
          event: await this.planner.updateEvent(event),
        }),
    );
  }

  removeEvent(id: number): Promise<SchedulingResult> {
    return this.run(async () => {
      await this.planner.removeEvent(id);
      return { status: 'saved' };
    });
  }

  scheduleTask(taskId: number, date: string, slotTime: string): Promise<SchedulingResult> {
    return this.run(async () => {
      return { status: 'saved', event: await this.planner.scheduleTask(taskId, date, slotTime) };
    });
  }

  private async run(operation: () => Promise<SchedulingResult>): Promise<SchedulingResult> {
    if (this.busy()) return { status: 'busy' };
    this.saving.set(true);
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 409) return { status: 'occupied' };
        if (error.status === 404) return { status: 'missing-task' };
        if (error.status === 400 || error.status === 422) return { status: 'invalid' };
      }
      return { status: 'failed' };
    } finally {
      this.saving.set(false);
    }
  }
}
