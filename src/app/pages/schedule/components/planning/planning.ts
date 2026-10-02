import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { PlannerViewService } from '@app/shared/planner-view.service';
import type {
  PlannerEvent,
  PlannerEventDraft,
  PlannerViewMode,
  SchedulingFailure,
  SchedulingResult,
} from '@pages/schedule/models';
import { HabitExecutionService } from '@pages/schedule/services/habit-execution.service';
import { PlannerSchedulingService } from '@pages/schedule/services/planner-scheduling.service';
import { PlannerService } from '@pages/schedule/services/planner.service';
import { addDays, dateKey, formatPlannerDuration, startOfDay } from '@pages/schedule/utils';
import { PlannerEventTray } from '../event-tray/planner-event-tray/planner-event-tray';
import { PlannerEventForm } from '../events/planner-event-form/planner-event-form';
import { PlannerEventList } from '../events/planner-event-list/planner-event-list';
import { PlannerSidebar } from '../sidebar/planner-sidebar/planner-sidebar';
import { PlannerDayView } from '../views/planner-day-view/planner-day-view';
import { PlannerRadialView } from '../views/planner-radial-view/planner-radial-view';
import { PlannerWeekView } from '../views/planner-week-view/planner-week-view';

const UNDATED_DROP_LIST_ID = 'undated-events';

const FAILURE_MESSAGES: Readonly<Record<SchedulingFailure, string>> = {
  occupied: 'Este horário já está ocupado. Escolha outro horário ou ajuste o período da repetição.',
  invalid: 'Revise as datas, os horários e a frequência. Use até 1.000 ocorrências em até 10 anos.',
  'missing-event': 'Este evento não está mais disponível. Atualize o planejamento.',
  unauthorized: 'Sua sessão expirou. Entre novamente para continuar.',
  forbidden: 'Você não tem permissão para alterar este evento.',
  busy: 'Aguarde a operação em andamento.',
  failed: 'Não foi possível salvar. Seus dados foram mantidos; tente novamente.',
};

/** Composes the planner and keeps the visual state of selection, messages and forms. */
@Component({
  selector: 'app-planning',
  providers: [HabitExecutionService],
  imports: [
    PlannerDayView,
    PlannerEventForm,
    PlannerEventList,
    PlannerEventTray,
    PlannerRadialView,
    PlannerSidebar,
    PlannerWeekView,
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

  readonly selectedDate = input<Date>(startOfDay(new Date()));
  readonly viewMode = input<PlannerViewMode>('daily');
  readonly newEventRequest = input(0);
  readonly selectedDateChange = output<Date>();

  readonly radialView = viewChild(PlannerRadialView);
  readonly dayView = viewChild(PlannerDayView);

  readonly events = this.planner.events;
  readonly undatedEvents = this.planner.undatedEvents;
  readonly plannerError = this.planner.error;
  readonly habits = this.habitExecution.habits;
  readonly habitError = this.habitExecution.error;

  readonly selectedUndatedEvent = signal<PlannerEvent | null>(null);
  readonly scheduleMessage = signal('');
  readonly operationError = signal('');
  readonly eventFormOpen = signal(false);
  readonly editingEvent = signal<PlannerEvent | null>(null);

  private readonly selectedDateKey = computed(() => dateKey(this.selectedDate()));
  readonly untimedEvents = computed(() =>
    this.events().filter((event) => event.date === this.selectedDateKey() && !event.startTime),
  );
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
      : (this.dayView()?.visibleSlotTimes() ?? []).map((time) => `daily-slot-${time}`),
  );
  readonly dragAndDropEnabled = computed(
    () => this.viewMode() === 'daily' && !this.scheduling.busy(),
  );

  constructor() {
    effect(() => this.planner.loadSummary(this.selectedDateKey()));
    effect(() => this.habitExecution.load(this.selectedDateKey()));
    effect(() => {
      this.selectedDateKey();
      this.viewMode();
      this.selectedUndatedEvent.set(null);
      this.scheduleMessage.set('');
    });
    effect(() => {
      if (this.newEventRequest() > 0) untracked(() => this.openEventCreator());
    });
  }

  reload(): void {
    this.planner.load();
    this.reloadSummary();
  }

  reloadHabits(): void {
    this.habitExecution.load(this.selectedDateKey());
  }

  toggleHabit(id: number): void {
    void this.habitExecution.toggle(id);
  }

  changeDay(amount: number): void {
    this.selectedDateChange.emit(addDays(this.selectedDate(), amount));
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

  onUndatedEventDropped(
    drop: CdkDragDrop<unknown, PlannerEvent[], PlannerEvent>,
    slotTime: string,
  ): void {
    if (
      this.dragAndDropEnabled() &&
      drop.previousContainer.id === UNDATED_DROP_LIST_ID &&
      drop.isPointerOverContainer
    )
      void this.scheduleUndatedEvent(drop.item.data, slotTime);
  }

  scheduleSelectedEvent(time: string): void {
    const event = this.selectedUndatedEvent();
    if (event) void this.scheduleUndatedEvent(event, time);
  }

  async scheduleUndatedEvent(event: PlannerEvent, time: string): Promise<void> {
    const date = this.selectedDateKey();
    const result = await this.scheduling.scheduleUndatedEvent(event, date, time);
    if (!this.showResult(result)) return;

    this.reloadSummary();
    if (this.selectedUndatedEvent()?.id === event.id) this.selectedUndatedEvent.set(null);
    // The user may have changed day while the request was pending.
    if (date === this.selectedDateKey()) {
      const startTime = (result.status === 'saved' && result.event?.startTime) || time;
      this.scheduleMessage.set(`${event.title} agendado para ${startTime}.`);
    }
  }

  endUndatedEventDrag(): void {
    this.radialView()?.hoveredHour.set(null);
  }

  private openEventCreator(): void {
    if (this.scheduling.busy()) {
      this.operationError.set(FAILURE_MESSAGES.busy);
      return;
    }
    this.editingEvent.set(null);
    this.eventFormOpen.set(true);
  }

  private showResult(result: SchedulingResult): boolean {
    this.operationError.set(result.status === 'saved' ? '' : FAILURE_MESSAGES[result.status]);
    return result.status === 'saved';
  }

  private reloadSummary(): void {
    this.planner.loadSummary(this.selectedDateKey());
  }
}
