import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerCategory, PlannerTask } from '@pages/schedule/models';

const CATEGORY_LABELS: Record<PlannerCategory, string> = {
  work: 'Trabalho',
  study: 'Estudos',
  personal: 'Pessoal',
  health: 'Saúde',
  event: 'Evento',
  habit: 'Hábito',
};

@Component({
  selector: 'app-planner-unscheduled-tasks',
  imports: [DragDropModule, MatIconModule],
  templateUrl: './planner-unscheduled-tasks.html',
  styleUrl: './planner-unscheduled-tasks.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerUnscheduledTasks {
  readonly tasks = input<PlannerTask[]>([]);
  readonly connectedDropListIds = input<string[]>([]);
  readonly dragEnabled = input(false);
  readonly selectedTaskId = input<number | null>(null);
  readonly taskSelected = output<PlannerTask>();
  readonly dragMoved = output<CdkDragMove<PlannerTask>>();
  readonly dragEnded = output<void>();
  readonly taskCount = computed(() => this.tasks().length);
  private suppressClick = false;

  beginDrag(): void {
    this.suppressClick = true;
  }
  endDrag(): void {
    this.dragEnded.emit();
  }
  selectTask(task: PlannerTask): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.taskSelected.emit(task);
  }

  prepareClick(): void {
    this.suppressClick = false;
  }

  categoryLabel(category: PlannerCategory): string {
    return CATEGORY_LABELS[category];
  }
}
