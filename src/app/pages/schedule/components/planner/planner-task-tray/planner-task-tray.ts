import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CdkDragMove } from '@angular/cdk/drag-drop';
import type { PlannerDayAvailability, PlannerTask } from '@pages/schedule/models';
import { PlannerUnscheduledTasks } from '@pages/schedule/components/planner/planner-unscheduled-tasks/planner-unscheduled-tasks';

@Component({
  selector: 'app-planner-task-tray',
  imports: [PlannerUnscheduledTasks],
  templateUrl: './planner-task-tray.html',
  styleUrl: './planner-task-tray.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerTaskTray {
  readonly tasks = input<PlannerTask[]>([]);
  readonly availability = input.required<PlannerDayAvailability>();
  readonly selectedTask = input<PlannerTask | null>(null);
  readonly selectedTaskChange = output<PlannerTask | null>();
  readonly connectedDropListIds = input<string[]>([]);
  readonly busy = input(false);
  readonly message = input('');
  readonly scheduleRequested = output<{ task: PlannerTask; time: string }>();
  readonly dragMoved = output<CdkDragMove<PlannerTask>>();
  readonly dragEnded = output<void>();
  readonly selectedTime = signal('');
  readonly selectedId = computed(() => this.selectedTask()?.id);
  readonly canSchedule = computed(
    () =>
      !this.busy() &&
      this.availability().slots.some(
        (slot) => slot.startTime === this.selectedTime() && slot.available,
      ),
  );

  constructor() {
    effect(() => {
      this.selectedId();
      const availability = this.availability();
      const current = untracked(this.selectedTime);
      this.selectedTime.set(
        availability.slots.find((slot) => slot.available && slot.startTime === current)
          ?.startTime ??
          availability.slots.find((slot) => slot.available)?.startTime ??
          '',
      );
    });
  }

  selectTask(task: PlannerTask): void {
    if (!this.busy())
      this.selectedTaskChange.emit(this.selectedTask()?.id === task.id ? null : task);
  }

  chooseTime(event: Event): void {
    this.selectedTime.set((event.target as HTMLSelectElement).value);
  }

  schedule(): void {
    const task = this.selectedTask();
    if (task && this.canSchedule())
      this.scheduleRequested.emit({ task, time: this.selectedTime() });
  }
}
