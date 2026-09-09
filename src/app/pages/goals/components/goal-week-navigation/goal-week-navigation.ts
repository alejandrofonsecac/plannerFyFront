import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GoalWeek } from '../../../../shared/goals/goal.models';
@Component({
  selector: 'app-goal-week-navigation',
  imports: [MatIconModule, DatePipe],
  templateUrl: './goal-week-navigation.html',
  styleUrl: './goal-week-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalWeekNavigation {
  readonly week = input.required<GoalWeek>();
  readonly disabled = input(false);
  readonly previous = output<void>();
  readonly next = output<void>();
  readonly current = output<void>();
}
