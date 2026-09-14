import { parseLocalDate, isPlannerInterval, hasPlannerConflict } from '@pages/schedule/utils';
import type { SchedulingResult, PlannerEvent, PlannerEventDraft } from '@pages/schedule/models';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { PLANNER_DAY_SLOTS } from '@pages/schedule/constants';
import { PlannerService } from './planner.service';

@Injectable({ providedIn: 'root' })
export class PlannerSchedulingService {
  private readonly planner = inject(PlannerService);
  private readonly saving = signal(false);
  readonly busy = this.saving.asReadonly();
  // Retain confirmed creations so a failed second request can be retried without a duplicate POST.
  private readonly pendingCleanup = new Map<number, PlannerEvent>();

  createEvent(draft: PlannerEventDraft): Promise<SchedulingResult> {
    return this.run(
      async () =>
        this.validate(draft) ?? { status: 'saved', event: await this.planner.createEvent(draft) },
    );
  }

  updateEvent(event: PlannerEvent): Promise<SchedulingResult> {
    return this.run(
      async () =>
        this.validate(event, event.id) ?? {
          status: 'saved',
          event: await this.planner.updateEvent(event),
        },
    );
  }

  removeEvent(id: number): Promise<SchedulingResult> {
    return this.run(async () => {
      await this.planner.removeEvent(id);
      for (const [taskId, event] of this.pendingCleanup)
        if (event.id === id) this.pendingCleanup.delete(taskId);
      return { status: 'saved' };
    });
  }

  scheduleTask(taskId: number, date: string, slotTime: string): Promise<SchedulingResult> {
    return this.run(async () => {
      const task = this.planner.unscheduledTasks().find((item) => item.id === taskId);
      if (!task) return { status: 'missing-task' };
      let event = this.pendingCleanup.get(taskId);
      if (!event) {
        const slot = PLANNER_DAY_SLOTS.find((item) => item.startTime === slotTime);
        if (!slot) return { status: 'invalid' };
        const draft = {
          title: task.title,
          date,
          description: '',
          category: task.category,
          ...slot,
        };
        const invalid = this.validate(draft);
        if (invalid) return invalid;
        event = await this.planner.createEvent(draft, 'task');
        this.pendingCleanup.set(taskId, event);
      }
      try {
        await this.planner.removeUnscheduledTask(taskId);
        this.pendingCleanup.delete(taskId);
        return { status: 'saved', event };
      } catch {
        return { status: 'cleanup-pending', event };
      }
    });
  }

  private validate(
    draft: Pick<PlannerEvent, 'date' | 'startTime' | 'endTime'>,
    ignoredId?: number,
  ): SchedulingResult | null {
    if (!parseLocalDate(draft.date) || !isPlannerInterval(draft)) return { status: 'invalid' };
    return hasPlannerConflict(this.planner.events(), draft, ignoredId)
      ? { status: 'occupied' }
      : null;
  }

  private async run(operation: () => Promise<SchedulingResult>): Promise<SchedulingResult> {
    if (this.busy()) return { status: 'busy' };
    this.saving.set(true);
    try {
      return await operation();
    } catch (error) {
      return {
        status: error instanceof HttpErrorResponse && error.status === 409 ? 'occupied' : 'failed',
      };
    } finally {
      this.saving.set(false);
    }
  }
}
