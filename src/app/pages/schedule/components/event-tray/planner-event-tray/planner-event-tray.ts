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
import type { PlannerDayAvailability, PlannerEvent } from '@pages/schedule/models';
import { PlannerUndatedEvents } from '../planner-undated-events/planner-undated-events';

/** Lists undated events and lets the user place the selected one in a free hour. */
@Component({
  selector: 'app-planner-event-tray',
  imports: [PlannerUndatedEvents],
  templateUrl: './planner-event-tray.html',
  styleUrl: './planner-event-tray.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerEventTray {
  readonly events = input<PlannerEvent[]>([]);
  readonly availability = input.required<PlannerDayAvailability>();
  readonly selectedEvent = input<PlannerEvent | null>(null);
  readonly connectedDropListIds = input<string[]>([]);
  readonly busy = input(false);
  readonly message = input('');
  readonly selectedEventChange = output<PlannerEvent | null>();
  readonly eventEdited = output<PlannerEvent>();
  readonly scheduleRequested = output<{ event: PlannerEvent; time: string }>();
  readonly dragMoved = output<CdkDragMove<PlannerEvent>>();
  readonly dragEnded = output<void>();

  readonly selectedTime = signal('');
  private readonly selectedId = computed(() => this.selectedEvent()?.id);
  private readonly freeSlots = computed(() =>
    this.availability().slots.filter((slot) => slot.available),
  );
  readonly canSchedule = computed(
    () => !this.busy() && this.freeSlots().some((slot) => slot.startTime === this.selectedTime()),
  );

  constructor() {
    // Keep the chosen hour while it stays free; otherwise suggest the first free hour.
    effect(() => {
      this.selectedId();
      const freeSlots = this.freeSlots();
      const current = untracked(this.selectedTime);
      this.selectedTime.set(
        freeSlots.find((slot) => slot.startTime === current)?.startTime ??
          freeSlots[0]?.startTime ??
          '',
      );
    });
  }

  toggleSelection(event: PlannerEvent): void {
    if (this.busy()) return;
    this.selectedEventChange.emit(this.selectedId() === event.id ? null : event);
  }

  chooseTime(event: Event): void {
    this.selectedTime.set((event.target as HTMLSelectElement).value);
  }

  schedule(): void {
    const event = this.selectedEvent();
    if (event && this.canSchedule())
      this.scheduleRequested.emit({ event, time: this.selectedTime() });
  }
}
