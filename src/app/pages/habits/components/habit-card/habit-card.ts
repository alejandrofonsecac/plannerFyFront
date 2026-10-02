import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { type Habit, HABIT_WEEKDAYS } from '../../models/habit';
import { formatHabitHistory } from '../../utils/habit-history';

@Component({
  selector: 'app-habit-card',
  imports: [MatIconModule, MatTooltipModule],
  templateUrl: './habit-card.html',
  styleUrl: './habit-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitCard {
  readonly habit = input.required<Habit>();
  readonly edit = output<Habit>();
  readonly remove = output<Habit>();
  readonly statusChange = output<Habit>();
  readonly expanded = signal(false);

  readonly metrics = computed(() => this.habit().metrics);
  readonly heatmap = computed(() => formatHabitHistory(this.habit()));

  toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }

  onOverviewKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleExpanded();
    }
  }

  frequencyLabel(): string {
    switch (this.habit().frequencyType) {
      case 'weekdays':
        return 'Dias úteis';
      case 'custom':
        return HABIT_WEEKDAYS.filter((day) => this.habit().daysOfWeek.includes(day.value))
          .map((day) => day.short)
          .join(' · ');
      default:
        return 'Todo dia';
    }
  }
}
