import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type {
  PlannerEvent,
  PlannerEventDraft,
  SchedulingFailure,
  SchedulingResult,
} from '@pages/schedule/models';
import { slotEndTime } from '@pages/schedule/utils';
import { PlannerService } from './planner.service';

const FAILURES_BY_STATUS: Readonly<Record<number, SchedulingFailure>> = {
  400: 'invalid',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'missing-event',
  409: 'occupied',
  422: 'invalid',
};

/** Serializes planner writes and translates API failures into explicit results. */
@Injectable({ providedIn: 'root' })
export class PlannerSchedulingService {
  private readonly planner = inject(PlannerService);
  private readonly saving = signal(false);
  readonly busy = this.saving.asReadonly();

  createEvent(draft: PlannerEventDraft): Promise<SchedulingResult> {
    return this.run(async () => ({
      status: 'saved',
      event: await this.planner.createEvent(draft),
    }));
  }

  updateEvent(event: PlannerEvent): Promise<SchedulingResult> {
    return this.run(async () => ({
      status: 'saved',
      event: await this.planner.updateEvent(event),
    }));
  }

  removeEvent(id: number): Promise<SchedulingResult> {
    return this.run(async () => {
      await this.planner.removeEvent(id);
      return { status: 'saved' };
    });
  }

  /**
   * Places an undated event in a one-hour block. Sending the end time lets the API
   * check conflicts; it skips that check for events without an end.
   */
  scheduleUndatedEvent(event: PlannerEvent, date: string, startTime: string) {
    return this.updateEvent({ ...event, date, startTime, endTime: slotEndTime(startTime) });
  }

  private async run(operation: () => Promise<SchedulingResult>): Promise<SchedulingResult> {
    if (this.busy()) return { status: 'busy' };
    this.saving.set(true);
    try {
      return await operation();
    } catch (error) {
      const failure = error instanceof HttpErrorResponse && FAILURES_BY_STATUS[error.status];
      return { status: failure || 'failed' };
    } finally {
      this.saving.set(false);
    }
  }
}
