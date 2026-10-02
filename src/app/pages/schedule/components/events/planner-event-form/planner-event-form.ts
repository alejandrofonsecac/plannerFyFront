import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { RecurrenceField } from '@app/shared/recurrence/recurrence-field';
import {
  recurrenceFormError,
  recurrenceLabel,
  recurrencePayload,
  type RecurrenceDraft,
} from '@app/shared/recurrence/recurrence.model';
import { PLANNER_CATEGORY_LABELS, PLANNER_EVENT_PRIORITIES } from '@pages/schedule/constants';
import type {
  PlannerCategory,
  PlannerEvent,
  PlannerEventDraft,
  PlannerEventPriority,
  PlannerEventSource,
} from '@pages/schedule/models';
import { dateKey, isPlannerInterval } from '@pages/schedule/utils';

const CATEGORY_ORDER: readonly PlannerCategory[] = [
  'work',
  'personal',
  'habit',
  'study',
  'health',
  'event',
];
const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '10:00';
const NO_RECURRENCE: RecurrenceDraft = { frequency: '', until: '' };

@Component({
  selector: 'app-planner-event-form',
  imports: [RecurrenceField],
  templateUrl: './planner-event-form.html',
  styleUrl: './planner-event-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerEventForm {
  readonly open = input(false);
  readonly saving = input(false);
  readonly requestError = input('');
  readonly date = input.required<Date>();
  readonly event = input<PlannerEvent | null>(null);
  readonly created = output<PlannerEventDraft>();
  readonly updated = output<PlannerEventDraft>();
  readonly removed = output<number>();
  readonly cancelled = output<void>();

  readonly categories = CATEGORY_ORDER.map((value) => ({
    value,
    label: PLANNER_CATEGORY_LABELS[value],
  }));
  readonly priorities = PLANNER_EVENT_PRIORITIES;
  readonly recurrenceLabel = recurrenceLabel;

  readonly title = signal('');
  readonly description = signal('');
  readonly priority = signal<PlannerEventPriority | ''>('');
  readonly eventDate = signal('');
  readonly startTime = signal(DEFAULT_START_TIME);
  readonly endTime = signal(DEFAULT_END_TIME);
  readonly category = signal<PlannerCategory>('work');
  readonly location = signal('');
  readonly source = signal<PlannerEventSource>('internal');
  readonly recurrence = signal<RecurrenceDraft>(NO_RECURRENCE);
  readonly completed = signal(false);
  readonly errorMessage = signal('');

  readonly isDirty = computed(() => {
    const event = this.event();
    if (!event) return true;

    return (
      this.title().trim() !== event.title ||
      this.description().trim() !== (event.description ?? '') ||
      this.priority() !== (event.priority ?? '') ||
      this.eventDate() !== (event.date ?? '') ||
      this.startTime() !== (event.startTime ?? '') ||
      this.endTime() !== (event.endTime ?? '') ||
      this.category() !== event.category ||
      this.location().trim() !== (event.location ?? '') ||
      this.source() !== (event.source ?? 'internal') ||
      this.completed() !== (event.completed ?? false)
    );
  });
  readonly heading = computed(() =>
    this.event()
      ? { eyebrow: 'Editar evento', title: 'Atualize este evento', submit: 'Salvar alterações' }
      : { eyebrow: 'Novo evento', title: 'Planeje um bloco no seu dia', submit: 'Criar evento' },
  );
  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.date()),
  );

  constructor() {
    effect(() => {
      if (this.open()) this.populate(this.event());
    });
  }

  updateTitle(event: Event): void {
    this.title.set(this.valueOf(event));
  }

  updateDescription(event: Event): void {
    this.description.set(this.valueOf(event));
  }

  updatePriority(event: Event): void {
    this.priority.set(this.valueOf(event) as PlannerEventPriority | '');
  }

  updateEventDate(event: Event): void {
    this.eventDate.set(this.valueOf(event));
  }

  updateStartTime(event: Event): void {
    this.startTime.set(this.valueOf(event));
  }

  updateEndTime(event: Event): void {
    this.endTime.set(this.valueOf(event));
  }

  setMidnight(event: Event): void {
    this.endTime.set(this.checkedOf(event) ? '24:00' : '23:59');
  }

  updateCategory(event: Event): void {
    this.category.set(this.valueOf(event) as PlannerCategory);
  }

  updateLocation(event: Event): void {
    this.location.set(this.valueOf(event));
  }

  updateSource(event: Event): void {
    this.source.set(this.valueOf(event) as PlannerEventSource);
  }

  updateCompleted(event: Event): void {
    this.completed.set(this.checkedOf(event));
  }

  /** Turns the event into an undated one; it can be placed later from the tray. */
  clearSchedule(): void {
    this.eventDate.set('');
    this.startTime.set('');
    this.endTime.set('');
    this.errorMessage.set('');
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    if (this.saving()) return;

    const error = this.validationError();
    if (error) {
      this.errorMessage.set(error);
      return;
    }

    const editing = this.event();
    const draft: PlannerEventDraft = {
      ...(editing ? {} : recurrencePayload(this.recurrence())),
      title: this.title().trim(),
      description: this.description().trim(),
      priority: this.priority() || null,
      date: this.eventDate() || null,
      startTime: this.startTime() || null,
      endTime: this.endTime() || null,
      category: this.category(),
      location: this.location().trim() || undefined,
      source: this.source(),
      completed: this.completed(),
    };

    if (!editing) this.created.emit(draft);
    else if (this.isDirty()) this.updated.emit(draft);
  }

  remove(): void {
    const event = this.event();
    if (event && !this.saving()) this.removed.emit(event.id);
  }

  cancel(): void {
    if (this.saving()) return;
    this.populate(null);
    this.cancelled.emit();
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancel();
  }

  private validationError(): string {
    const startTime = this.startTime() || null;
    const endTime = this.endTime() || null;

    if (!this.title().trim()) return 'Informe um nome para o evento.';
    if (startTime && !this.eventDate()) return 'Escolha um dia para definir o horário.';
    if (endTime && !startTime) return 'Informe o início antes do término.';
    if (!isPlannerInterval({ startTime, endTime }))
      return 'Escolha um término posterior ao início, entre 00:00 e 24:00.';
    return this.event() ? '' : recurrenceFormError(this.recurrence(), this.eventDate());
  }

  private populate(event: PlannerEvent | null): void {
    this.title.set(event?.title ?? '');
    this.description.set(event?.description ?? '');
    this.priority.set(event?.priority ?? '');
    this.eventDate.set(event ? (event.date ?? '') : dateKey(this.date()));
    this.startTime.set(event ? (event.startTime ?? '') : DEFAULT_START_TIME);
    this.endTime.set(event ? (event.endTime ?? '') : DEFAULT_END_TIME);
    this.category.set(event?.category ?? 'work');
    this.location.set(event?.location ?? '');
    this.source.set(event?.source ?? 'internal');
    this.recurrence.set(NO_RECURRENCE);
    this.completed.set(event?.completed ?? false);
    this.errorMessage.set('');
  }

  // Every edit clears the previous validation message.
  private valueOf(event: Event): string {
    this.errorMessage.set('');
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  private checkedOf(event: Event): boolean {
    this.errorMessage.set('');
    return (event.target as HTMLInputElement).checked;
  }
}
