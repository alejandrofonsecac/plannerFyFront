import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  untracked,
} from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import type {
  PlannerViewMode,
  PlannerEvent,
  PlannerEventDraft,
  PlannerTask,
  SchedulingResult,
} from '@pages/schedule/models';
import { dateKey, startOfDay, addDays, formatPlannerDuration } from '@pages/schedule/utils';
import { HabitExecutionService } from '@pages/schedule/services/habit-execution.service';
import { PlannerService } from '@pages/schedule/services/planner-services/planner.service';
import { PlannerSchedulingService } from '@pages/schedule/services/planner-services/planner-scheduling.service';
import { PlannerDayView } from './views/planner-day-view/planner-day-view';
import { PlannerSidebar } from './sidebar/planner-sidebar/planner-sidebar';
import { PlannerTaskTray } from './planner-task-tray/planner-task-tray';
import { PlannerWeekView } from './views/planner-week-view/planner-week-view';
import { PlannerEventForm } from './events/planner-event-form/planner-event-form';
import { PlannerRadialView } from './views/planner-radial-view/planner-radial-view';
import { PlannerViewService } from '@app/shared/planner-view.service';

const OPERATION_MESSAGES = {
  occupied: 'Este horário já está ocupado. Escolha outro horário disponível.',
  invalid: 'Informe uma data e um intervalo de horário válidos.',
  'missing-task': 'Esta tarefa não está mais na bandeja.',
  busy: 'Aguarde a operação em andamento.',
  failed: 'Não foi possível salvar. Seus dados foram mantidos; tente novamente.',
};

@Component({
  selector: 'app-planning',
  providers: [HabitExecutionService],
  imports: [
    PlannerDayView,
    PlannerWeekView,
    PlannerSidebar,
    PlannerTaskTray,
    PlannerEventForm,
    PlannerRadialView,
  ],
  templateUrl: './planning.html',
  styleUrl: './planning.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Planning {
  private readonly habitExecution = inject(HabitExecutionService);
  private readonly planner = inject(PlannerService);
  readonly scheduling = inject(PlannerSchedulingService);
  readonly preferences = inject(PlannerViewService);
  readonly habitError = this.habitExecution.error;
  readonly habits = this.habitExecution.habits;
  readonly events = this.planner.events;
  readonly unscheduledTasks = this.planner.unscheduledTasks;
  readonly radialView = viewChild(PlannerRadialView);
  readonly dayView = viewChild(PlannerDayView);
  readonly selectedDateChange = output<Date>();
  readonly selectedDate = input<Date>(startOfDay(new Date()));
  readonly viewMode = input<PlannerViewMode>('daily');
  readonly newEventRequest = input(0);
  readonly selectedTask = signal<PlannerTask | null>(null);
  readonly taskMessage = signal('');
  readonly operationError = signal('');
  readonly eventFormOpen = signal(false);
  readonly editingEvent = signal<PlannerEvent | null>(null);
  readonly summary = computed(() => {
    const value = this.planner.summary();
    if (!value) return null;
    return {
      ...value,
      plannedHours: formatPlannerDuration(value.plannedMinutes),
      freeTime: formatPlannerDuration(value.freeMinutes),
    };
  });
  readonly dailyDropListIds = computed(() =>
    this.preferences.display() === 'radial'
      ? ['radial-day']
      : (this.dayView()?.slots() ?? []).map((slot) => `daily-slot-${slot.startTime}`),
  );
  readonly dragAndDropEnabled = computed(
    () => this.viewMode() === 'daily' && !this.scheduling.busy(),
  );

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      this.planner.loadSummary(dateKey(date));
      this.viewMode();
      this.selectedTask.set(null);
      this.taskMessage.set('');
    });
    effect(() => this.habitExecution.load(dateKey(this.selectedDate())));
    effect(() => {
      if (this.newEventRequest() > 0) {
        if (untracked(this.scheduling.busy)) {
          this.operationError.set(OPERATION_MESSAGES.busy);
          return;
        }
        this.editingEvent.set(null);
        this.eventFormOpen.set(true);
      }
    });
  }

  reloadHabits(): void {
    this.habitExecution.load(dateKey(this.selectedDate()));
  }

  toggleHabit(id: number): void {
    void this.habitExecution.toggle(id);
  }

  async createEvent(draft: PlannerEventDraft): Promise<void> {
    if (this.showResult(await this.scheduling.createEvent(draft))) {
      this.reloadSummary();
      this.closeEventForm();
    }
  }

  async updateEvent(draft: PlannerEventDraft): Promise<void> {
    const event = this.editingEvent();
    if (event && this.showResult(await this.scheduling.updateEvent({ ...event, ...draft }))) {
      this.reloadSummary();
      this.closeEventForm();
    }
  }

  async removeEvent(id: number): Promise<void> {
    if (this.showResult(await this.scheduling.removeEvent(id))) {
      this.reloadSummary();
      if (this.editingEvent()?.id === id) this.closeEventForm();
    }
  }

  openEventEditor(event: PlannerEvent): void {
    if (this.scheduling.busy()) return;
    this.operationError.set('');
    this.editingEvent.set(event);
    this.eventFormOpen.set(true);
  }

  closeEventForm(): void {
    if (this.scheduling.busy()) return;
    this.eventFormOpen.set(false);
    this.editingEvent.set(null);
  }

  onTaskDropped(event: CdkDragDrop<unknown, PlannerTask[], PlannerTask>, slotTime: string): void {
    if (
      this.dragAndDropEnabled() &&
      event.previousContainer.id === 'unplanned-tasks' &&
      event.isPointerOverContainer
    )
      void this.scheduleTask(event.item.data, slotTime);
  }

  scheduleSelectedTask(time: string): void {
    const task = this.selectedTask();
    if (task) void this.scheduleTask(task, time);
  }

  async scheduleTask(task: PlannerTask, time: string): Promise<void> {
    const selectedDate = dateKey(this.selectedDate());
    const result = await this.scheduling.scheduleTask(task.id, selectedDate, time);
    if (this.showResult(result)) {
      this.reloadSummary();
      if (this.selectedTask()?.id === task.id) this.selectedTask.set(null);
      if (selectedDate === dateKey(this.selectedDate()))
        this.taskMessage.set(
          `${task.title} agendada para ${result.status === 'saved' ? (result.event?.startTime ?? time) : time}.`,
        );
    }
  }

  changeDay(amount: number): void {
    this.selectedDateChange.emit(addDays(this.selectedDate(), amount));
  }

  endTaskDrag(): void {
    this.radialView()?.hoveredHour.set(null);
  }

  private showResult(result: SchedulingResult): boolean {
    this.operationError.set(result.status === 'saved' ? '' : OPERATION_MESSAGES[result.status]);
    return result.status === 'saved';
  }

  private reloadSummary(): void {
    this.planner.loadSummary(dateKey(this.selectedDate()));
  }
}
