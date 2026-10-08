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
import { LocalClockService } from '@app/shared/local-clock.service';
import { PlannerViewService } from '@app/shared/planner-view.service';
import {
  PLANNER_DAY_HOUR_HEIGHT,
  PLANNER_DAY_SLOTS,
  PLANNER_PERIODS,
  PLANNER_SHORT_EVENT_MINUTES,
} from '@pages/schedule/constants';
import type {
  PlannerEvent,
  PlannerPeriodId,
  PlannerTimeSlot,
  PositionedPlannerEvent,
} from '@pages/schedule/models';
import { EventTimePipe } from '@pages/schedule/pipes/event-time.pipe';
import {
  dateKey,
  durationInMinutes,
  eventsInInterval,
  formatPlannerDuration,
  periodAtHour,
  plannerDaySegments,
  plannerEventGeometry,
  toMinutes,
} from '@pages/schedule/utils';

function toggled<T>(items: ReadonlySet<T>, item: T): ReadonlySet<T> {
  const next = new Set(items);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

@Component({
  selector: 'app-planner-day-view',
  imports: [DragDropModule, EventTimePipe],
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
  /** While an undated event is selected, hours act as scheduling targets. */
  readonly selectingSlot = input(false);
  readonly eventRemoved = output<number>();
  readonly eventEdited = output<PlannerEvent>();
  readonly slotSelected = output<string>();
  readonly undatedEventDropped = output<{
    event: CdkDragDrop<unknown, PlannerEvent[], PlannerEvent>;
    slotTime: string;
  }>();

  readonly periods = PLANNER_PERIODS;
  readonly hourHeight = PLANNER_DAY_HOUR_HEIGHT;
  readonly condensedHeight = 116;
  readonly activePeriod = signal<PlannerPeriodId>(periodAtHour(new Date().getHours()).id);
  readonly expandedSlots = signal<ReadonlySet<string>>(new Set());
  readonly expandedSegments = signal<ReadonlySet<string>>(new Set());
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
    const period =
      this.preferences.display() === 'periods'
        ? this.periods.find((item) => item.id === this.activePeriod())!
        : null;
    return PLANNER_DAY_SLOTS.filter((slot) => {
      const hour = toMinutes(slot.startTime) / 60;
      if (period && (hour < period.start || hour >= period.end)) return false;
      // Sleep hours stay visible when they hold events, so nothing scheduled disappears.
      return !this.preferences.isSleepHour(hour) || this.slotHasEvents(slot);
    });
  });
  readonly sleepLabel = computed(() => {
    const { enabled, start, end } = this.preferences.sleep();
    if (!enabled || start === end) return null;
    const time = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
    return `Horário de sono oculto · ${time(start)} – ${time(end)}`;
  });
  /** Segments are built per contiguous run, since hidden sleep hours leave gaps. */
  readonly segments = computed(() => {
    const runs: PlannerTimeSlot[][] = [];
    for (const slot of this.slots()) {
      const run = runs.at(-1);
      if (run && run[run.length - 1].endTime === slot.startTime) run.push(slot);
      else runs.push([slot]);
    }
    return runs.flatMap((run) =>
      plannerDaySegments(run, this.events(), this.expandedSegments()),
    );
  });
  /** Hours rendered as drop targets; condensed segments have none. */
  readonly visibleSlotTimes = computed(() =>
    this.segments().flatMap((segment) =>
      segment.kind !== 'events' ? segment.slots.map((slot) => slot.startTime) : [],
    ),
  );

  constructor() {
    effect(() => {
      this.date();
      this.preferences.display();
      untracked(() => {
        this.activePeriod.set(this.currentPeriod());
        this.expandedSlots.set(new Set());
        this.expandedSegments.set(new Set());
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

  slotHasEvents(slot: PlannerTimeSlot): boolean {
    return (
      eventsInInterval(this.events(), toMinutes(slot.startTime), toMinutes(slot.endTime)).length > 0
    );
  }

  activateSlot(time: string): void {
    if (this.selectingSlot()) {
      this.slotSelected.emit(time);
      return;
    }
    this.expandedSlots.update((slots) => toggled(slots, time));
  }

  toggleSegment(id: string): void {
    this.expandedSegments.update((segments) => toggled(segments, id));
  }

  eventGeometry(event: PositionedPlannerEvent, segmentStartMinute: number, slotCount: number) {
    return plannerEventGeometry(
      event,
      segmentStartMinute,
      this.hourHeight,
      segmentStartMinute + slotCount * 60,
    );
  }

  isShortEvent(event: PlannerEvent): boolean {
    return durationInMinutes(event) < PLANNER_SHORT_EVENT_MINUTES;
  }

  durationLabel(event: PlannerEvent): string {
    return formatPlannerDuration(durationInMinutes(event));
  }

  dropUndatedEvent(
    event: CdkDragDrop<unknown, PlannerEvent[], PlannerEvent>,
    slotTime: string,
  ): void {
    this.undatedEventDropped.emit({ event, slotTime });
  }
}
