import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDragDrop, CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { LocalClockService } from '@app/shared/local-clock.service';
import type { PlannerEvent, PlannerTask, RadialGroup } from '@pages/schedule/models';
import { dateKey, clockArc, hourAtPoint, pointOnClock, radialGroups } from '@pages/schedule/utils';

@Component({
  selector: 'app-planner-radial-view',
  imports: [DragDropModule],
  templateUrl: './planner-radial-view.html',
  styleUrl: './planner-radial-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerRadialView {
  private readonly clock = inject(LocalClockService);
  private readonly dial = viewChild<ElementRef<HTMLElement>>('dial');
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');
  readonly date = input.required<Date>();
  readonly events = input<PlannerEvent[]>([]);
  readonly selectingTask = input(false);
  readonly taskDropped = output<{
    event: CdkDragDrop<unknown, PlannerTask[], PlannerTask>;
    slotTime: string;
  }>();
  readonly slotSelected = output<string>();
  readonly dayChanged = output<number>();
  readonly eventEdited = output<PlannerEvent>();
  readonly hoveredHour = signal<number | null>(null);
  readonly selectedGroupId = signal<string | null>(null);
  readonly groups = computed(() => radialGroups(this.events()));
  readonly selectedGroup = computed(() =>
    this.groups().find((group) => group.id === this.selectedGroupId()),
  );
  readonly timeLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
      this.clock.now(),
    ),
  );
  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(
      this.date(),
    ),
  );
  readonly today = computed(() => dateKey(this.date()) === dateKey(this.clock.now()));
  readonly nowPoint = computed(() =>
    pointOnClock((this.clock.now().getHours() * 60 + this.clock.now().getMinutes()) / 4, 116),
  );
  readonly previewPath = computed(() =>
    this.hoveredHour() === null ? '' : clockArc(this.hoveredHour()! * 15, 15),
  );
  readonly labels = Array.from({ length: 8 }, (_, index) => ({
    hour: index * 3,
    ...pointOnClock(index * 45, 157),
  }));
  readonly ticks = Array.from({ length: 24 }, (_, index) => ({
    inner: pointOnClock(index * 15, 121),
    outer: pointOnClock(index * 15, 125),
  }));
  private swipeStart: { x: number; y: number } | null = null;
  private swiped = false;

  constructor() {
    effect(() => {
      const sheet = this.sheet()?.nativeElement;
      if (this.selectedGroup()) {
        if (sheet && !sheet.open) sheet.showModal();
      } else if (sheet?.open) sheet.close();
    });
    effect(() => {
      this.date();
      this.hoveredHour.set(null);
      this.selectedGroupId.set(null);
    });
  }

  timeForHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  dragMoved(event: CdkDragMove<PlannerTask>): void {
    const hour = this.hourFromPagePoint(event.pointerPosition);
    if (hour !== this.hoveredHour() && hour !== null && event.event.type.startsWith('touch')) {
      // Vibration is progressive enhancement; unsupported browsers simply omit it.
      try {
        this.dial()?.nativeElement.ownerDocument.defaultView?.navigator.vibrate?.(8);
      } catch {
        /* Optional haptic. */
      }
    }
    this.hoveredHour.set(hour);
  }

  dropTask(event: CdkDragDrop<unknown, PlannerTask[], PlannerTask>): void {
    const hour = this.hourFromPagePoint(event.dropPoint);
    if (hour !== null && event.isPointerOverContainer)
      this.taskDropped.emit({ event, slotTime: this.timeForHour(hour) });
    this.hoveredHour.set(null);
  }

  private hourFromPagePoint(point: { x: number; y: number }): number | null {
    const element = this.dial()?.nativeElement;
    if (!element) return null;
    const bounds = element.getBoundingClientRect();
    // CDK normalizes its pointer and drop positions to viewport coordinates.
    const x = point.x - bounds.left - bounds.width / 2;
    const y = point.y - bounds.top - bounds.height / 2;
    const distance = Math.hypot(x, y);
    const radius = (bounds.width * 132) / 340;
    return distance >= radius * 0.58 && distance <= radius + 30 ? hourAtPoint(x, y) : null;
  }

  selectOnDial(event: MouseEvent): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    if (!this.selectingTask()) return;
    const hour = this.hourFromPagePoint({ x: event.clientX, y: event.clientY });
    if (hour !== null) this.slotSelected.emit(this.timeForHour(hour));
  }

  openGroup(group: RadialGroup, event: Event): void {
    if (this.swiped) {
      this.swiped = false;
      event.stopPropagation();
      return;
    }
    if (this.selectingTask()) return;
    event.stopPropagation();
    this.selectedGroupId.set(group.id);
  }

  editEvent(event: PlannerEvent): void {
    this.closeDetails();
    this.eventEdited.emit(event);
  }

  closeDetails(): void {
    this.selectedGroupId.set(null);
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeDetails();
  }

  startSwipe(event: PointerEvent): void {
    this.swiped = false;
    this.swipeStart =
      !this.selectingTask() && event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
  }

  endSwipe(event: PointerEvent): void {
    if (!this.swipeStart) return;
    const dx = event.clientX - this.swipeStart.x;
    const dy = event.clientY - this.swipeStart.y;
    this.swipeStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this.swiped = true;
      this.dayChanged.emit(dx < 0 ? 1 : -1);
    }
  }

  cancelSwipe(): void {
    this.swipeStart = null;
  }
}
