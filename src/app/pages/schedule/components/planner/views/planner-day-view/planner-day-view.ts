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
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { PLANNER_DAY_SLOTS, PLANNER_PERIODS } from '@pages/schedule/constants';
import type { PlannerEvent, PlannerTask, PlannerPeriodId } from '@pages/schedule/models';
import { dateKey, toMinutes, eventsInInterval, periodAtHour } from '@pages/schedule/utils';
import { PlannerViewService } from '@app/shared/planner-view.service';
import { LocalClockService } from '@app/shared/local-clock.service';

@Component({
  selector: 'app-planner-day-view',
  imports: [DragDropModule],
  templateUrl: './planner-day-view.html',
  styleUrl: './planner-day-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerDayView {
  readonly preferences = inject(PlannerViewService);
  private readonly clock = inject(LocalClockService);
  readonly date = input.required<Date>();
  readonly events = input<PlannerEvent[]>([]);
  readonly dragEnabled = input(false);
  readonly selectingTask = input(false);
  readonly eventRemoved = output<number>();
  readonly eventEdited = output<PlannerEvent>();
  readonly slotSelected = output<string>();
  readonly taskDropped = output<{
    event: CdkDragDrop<unknown, PlannerTask[], PlannerTask>;
    slotTime: string;
  }>();
  readonly periods = PLANNER_PERIODS;
  readonly activePeriod = signal<PlannerPeriodId>(periodAtHour(new Date().getHours()).id);
  readonly expandedSlots = signal<ReadonlySet<string>>(new Set());
  readonly currentPeriod = computed(() => periodAtHour(this.clock.now().getHours()).id);
  readonly today = computed(() => dateKey(this.date()) === dateKey(this.clock.now()));
  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(this.date()),
  );
  readonly slots = computed(() => {
    const period = this.periods.find((item) => item.id === this.activePeriod())!;
    return PLANNER_DAY_SLOTS.filter((slot) => {
      const hour = toMinutes(slot.startTime) / 60;
      return (
        this.preferences.display() !== 'periods' || (hour >= period.start && hour < period.end)
      );
    }).map((slot) => ({
      ...slot,
      events: eventsInInterval(this.events(), toMinutes(slot.startTime), toMinutes(slot.endTime)),
    }));
  });

  constructor() {
    effect(() => {
      this.date();
      this.preferences.display();
      untracked(() => {
        this.activePeriod.set(this.currentPeriod());
        this.expandedSlots.set(new Set());
      });
    });
    effect(() => {
      if (this.preferences.display() === 'periods' && this.today())
        this.activePeriod.set(this.currentPeriod());
    });
  }

  periodCount(start: number, end: number): number {
    return eventsInInterval(this.events(), start * 60, end * 60).length;
  }

  activateSlot(time: string): void {
    if (this.selectingTask()) {
      this.slotSelected.emit(time);
      return;
    }
    this.expandedSlots.update((slots) => {
      const next = new Set(slots);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return next;
    });
  }

  dropTask(event: CdkDragDrop<unknown, PlannerTask[], PlannerTask>, slotTime: string): void {
    this.taskDropped.emit({ event, slotTime });
  }
}
