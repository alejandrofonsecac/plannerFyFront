import { Pipe, type PipeTransform } from '@angular/core';
import type { PlannerEvent } from '@pages/schedule/models';
import { formatEventTime } from '@pages/schedule/utils';

/** Displays an event's time range, start-only point or absence of time. */
@Pipe({ name: 'eventTime' })
export class EventTimePipe implements PipeTransform {
  transform(event: Pick<PlannerEvent, 'startTime' | 'endTime'>): string {
    return formatEventTime(event);
  }
}
