import { isPlannerInterval } from '@pages/schedule/utils';
import { RecurrenceField } from '@app/shared/recurrence/recurrence-field';
import {
  recurrencePayload,
  recurrenceFormError,
  recurrenceLabel,
  type RecurrenceDraft,
} from '@app/shared/recurrence/recurrence.model';
import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventDraft,
  CalendarEventSource,
} from '../../models';

interface EventFormDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  source: CalendarEventSource;
  category: CalendarEventCategory;
  completed: boolean;
  priority: 'Alta' | 'Média' | 'Normal' | '';
}

const CATEGORY_OPTIONS: { value: CalendarEventCategory; label: string }[] = [
  { value: 'work', label: 'Trabalho' },
  { value: 'study', label: 'Estudos' },
  { value: 'personal', label: 'Pessoal' },
  { value: 'health', label: 'Saúde' },
  { value: 'event', label: 'Evento' },
  { value: 'habit', label: 'Hábito' },
];

@Component({
  selector: 'app-calendar-event-form',
  imports: [FormsModule, MatIconModule, RecurrenceField],
  templateUrl: './calendar-event-form.html',
  styleUrl: './calendar-event-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventForm {
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly recurrence = signal<RecurrenceDraft>({ frequency: '', until: '' });
  readonly validationError = signal('');
  readonly recurrenceLabel = recurrenceLabel;
  readonly event = input<CalendarEvent | null>(null);
  readonly initialDate = input.required<string>();
  readonly formSubmitted = output<CalendarEventDraft>();
  readonly dismissed = output<void>();
  readonly categories = CATEGORY_OPTIONS;

  draft: EventFormDraft = this.emptyDraft('');
  submitted = false;

  constructor() {
    effect(() => {
      const event = this.event();
      this.draft = event
        ? {
            title: event.title,
            date: event.date ?? '',
            startTime: event.startTime ?? '',
            endTime: event.endTime ?? '',
            description: event.description,
            location: event.location ?? '',
            source: event.source,
            category: event.category,
            completed: event.completed ?? false,
            priority: event.priority ?? '',
          }
        : this.emptyDraft(this.initialDate());
      this.submitted = false;
      this.recurrence.set({ frequency: '', until: '' });
      this.validationError.set('');
    });
  }

  submit(): void {
    if (this.saving()) return;
    this.submitted = true;
    if (!this.draft.title.trim()) return;
    if ((this.draft.startTime && !this.draft.date) || !isPlannerInterval({ startTime: this.draft.startTime || null, endTime: this.draft.endTime || null })) {
      this.validationError.set('Informe uma data para o início e um término posterior, se houver.');
      return;
    }

    this.validationError.set(
      this.event() ? '' : recurrenceFormError(this.recurrence(), this.draft.date),
    );
    if (this.validationError()) return;
    this.formSubmitted.emit({
      ...(!this.event() ? recurrencePayload(this.recurrence()) : {}),
      completed: this.draft.completed,
      priority: this.draft.priority || null,
      title: this.draft.title.trim(),
      date: this.draft.date || null,
      startTime: this.draft.startTime || null,
      endTime: this.draft.endTime || null,
      description: this.draft.description.trim(),
      location: this.draft.location.trim() || undefined,
      source: this.draft.source,
      category: this.draft.category,
    });
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismissed.emit();
  }

  private emptyDraft(date: string): EventFormDraft {
    return {
      title: '',
      date,
      startTime: '09:00',
      endTime: '10:00',
      description: '',
      location: '',
      source: 'internal',
      category: 'work',
      completed: false,
      priority: '',
    };
  }
}
