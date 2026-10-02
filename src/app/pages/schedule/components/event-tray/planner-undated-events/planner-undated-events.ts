import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { PLANNER_CATEGORY_LABELS } from '@pages/schedule/constants';
import type { PlannerEvent } from '@pages/schedule/models';

/** Draggable chips for undated events; the drop list id is `undated-events`. */
@Component({
  selector: 'app-planner-undated-events',
  imports: [DragDropModule, MatIconModule],
  templateUrl: './planner-undated-events.html',
  styleUrl: './planner-undated-events.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerUndatedEvents {
  readonly events = input<PlannerEvent[]>([]);
  readonly connectedDropListIds = input<string[]>([]);
  readonly dragEnabled = input(false);
  readonly selectedEventId = input<number | null>(null);
  readonly eventSelected = output<PlannerEvent>();
  readonly dragMoved = output<CdkDragMove<PlannerEvent>>();
  readonly dragEnded = output<void>();
  readonly categoryLabels = PLANNER_CATEGORY_LABELS;
  // A drag ends with a click on the chip; ignore it so dropping does not also select.
  private suppressClick = false;

  prepareClick(): void {
    this.suppressClick = false;
  }

  beginDrag(): void {
    this.suppressClick = true;
  }

  select(event: PlannerEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.eventSelected.emit(event);
  }
}
