import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Planning } from './components/planning/planning';
import { ScheduleHeader } from './components/schedule-header/schedule-header';
import type { PlannerViewMode } from './models';
import { startOfDay } from './utils';

/** Agenda page: shares the selected date and view mode between the header and the planner. */
@Component({
  selector: 'app-schedule',
  imports: [Planning, ScheduleHeader],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Schedule {
  readonly selectedDate = signal(startOfDay(new Date()));
  readonly viewMode = signal<PlannerViewMode>('daily');
  /** Incremented to ask the planner to open the creation form. */
  readonly newEventRequest = signal(0);

  requestNewEvent(): void {
    this.newEventRequest.update((request) => request + 1);
  }
}
