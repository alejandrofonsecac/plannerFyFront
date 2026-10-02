import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PlannerEvent } from '@pages/schedule/models';

let nextId = 0;

/** Compact list of events that have no place on the timeline (undated or untimed). */
@Component({
  selector: 'app-planner-event-list',
  templateUrl: './planner-event-list.html',
  styleUrl: './planner-event-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerEventList {
  readonly heading = input.required<string>();
  readonly events = input<PlannerEvent[]>([]);
  readonly emptyMessage = input('');
  readonly disabled = input(false);
  readonly eventSelected = output<PlannerEvent>();
  readonly headingId = `planner-event-list-${nextId++}`;
}
