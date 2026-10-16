import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  RECURRENCE_OPTIONS,
  type RecurrenceDraft,
  type RecurrenceFrequency,
} from './recurrence.model';

@Component({
  selector: 'app-recurrence-field',
  imports: [MatIconModule],
  templateUrl: './recurrence-field.html',
  styleUrl: './recurrence-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurrenceField {
  readonly value = model<RecurrenceDraft>({ frequency: '', until: '' });
  readonly startDate = input('');
  readonly disabled = input(false);
  readonly options = RECURRENCE_OPTIONS;
  readonly weekdaysOnly = computed(
    () => this.value().frequency === 'DAILY' && !!this.value().weekdaysOnly,
  );

  changeFrequency(event: Event): void {
    const frequency = (event.target as HTMLSelectElement).value as RecurrenceFrequency;
    this.value.update((value) => ({
      ...value,
      frequency,
      weekdaysOnly: frequency === 'DAILY' && !!value.weekdaysOnly,
    }));
  }

  // Weekdays only is a daily repetition, so checking it also selects "Todo dia".
  changeWeekdaysOnly(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.value.update((value) => ({
      ...value,
      frequency: checked ? 'DAILY' : value.frequency,
      weekdaysOnly: checked,
    }));
  }

  changeUntil(event: Event): void {
    this.value.update((value) => ({ ...value, until: (event.target as HTMLInputElement).value }));
  }

  useYearEnd(): void {
    if (this.startDate()) {
      this.value.update((value) => ({ ...value, until: `${this.startDate().slice(0, 4)}-12-31` }));
    }
  }
}
