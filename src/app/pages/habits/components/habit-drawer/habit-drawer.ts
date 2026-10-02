import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategoryService } from '../../../../shared/components/categories';
import {
  type Habit,
  type HabitDraft,
  HABIT_WEEKDAYS,
  emptyHabitDraft,
  habitToDraft,
} from '../../models/habit';

const HABIT_ICONS = [
  'self_improvement',
  'water_drop',
  'fitness_center',
  'auto_stories',
  'psychology',
  'bedtime',
  'restaurant',
  'directions_run',
  'spa',
  'edit_note',
];

@Component({
  selector: 'app-habit-drawer',
  imports: [FormsModule, MatIconModule],
  templateUrl: './habit-drawer.html',
  styleUrl: './habit-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitDrawer {
  private readonly categoryService = inject(CategoryService);

  readonly habit = input<Habit | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly dismissed = output<void>();
  readonly formSubmitted = output<HabitDraft>();
  readonly categories = this.categoryService.categories;
  readonly icons = HABIT_ICONS;
  readonly weekdays = HABIT_WEEKDAYS;
  draft: HabitDraft = emptyHabitDraft();
  submitted = false;

  constructor() {
    effect(() => {
      const habit = this.habit();
      this.draft = habit ? habitToDraft(habit) : emptyHabitDraft();
      this.submitted = false;
    });
  }

  submit(): void {
    if (this.saving()) return;
    this.submitted = true;
    if (!this.draft.name.trim()) return;
    if (this.draft.frequencyType === 'custom' && !this.draft.daysOfWeek?.length) return;

    this.formSubmitted.emit({
      ...this.draft,
      daysOfWeek: this.draft.frequencyType === 'custom' ? [...(this.draft.daysOfWeek ?? [])] : [],
    });
  }

  toggleWeekday(day: number): void {
    if (this.saving()) return;
    const selected = this.draft.daysOfWeek ?? [];
    this.draft = {
      ...this.draft,
      daysOfWeek: selected.includes(day)
        ? selected.filter((value) => value !== day)
        : [...selected, day].sort((first, second) => first - second),
    };
  }

  setIcon(icon: string): void {
    this.draft = { ...this.draft, icon };
  }

  setCategory(categoryId: string): void {
    this.draft = { ...this.draft, categoryId };
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismissed.emit();
  }
}
